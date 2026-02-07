// Copyright (c) 2019-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package gcal

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/mattermost/mattermost-plugin-mscalendar/calendar/engine"
	"github.com/mattermost/mattermost-plugin-mscalendar/calendar/remote"
	"github.com/mattermost/mattermost-plugin-mscalendar/calendar/utils/httputils"
)

// EventsResponse is the JSON response for the events API
type EventsResponse struct {
	Events   []*EventDTO `json:"events"`
	Timezone string      `json:"timezone,omitempty"`
	Error    string      `json:"error,omitempty"`
}

// EventDTO is a simplified event for the frontend
type EventDTO struct {
	ID          string `json:"id"`
	Subject     string `json:"subject"`
	Start       string `json:"start"`
	End         string `json:"end"`
	Location    string `json:"location,omitempty"`
	IsAllDay    bool   `json:"isAllDay"`
	WebLink     string `json:"webLink,omitempty"`
	Organizer   string `json:"organizer,omitempty"`
	Description string `json:"description,omitempty"`
	Conference  string `json:"conference,omitempty"`
}

// CreateEventRequest is the request body for creating an event
type CreateEventRequest struct {
	Subject            string   `json:"subject"`
	AllDay             bool     `json:"all_day"`
	Attendees          []string `json:"attendees"`
	Date               string   `json:"date"`
	StartTime          string   `json:"start_time"`
	EndTime            string   `json:"end_time"`
	Description        string   `json:"description"`
	Location           string   `json:"location"`
	ChannelID          string   `json:"channel_id"`
	AddMattermostCall  bool     `json:"add_mattermost_call"`
}

// CreateEventResponse is the response for creating an event
type CreateEventResponse struct {
	Event    *EventDTO `json:"event,omitempty"`
	CallLink string    `json:"call_link,omitempty"`
	Error    string    `json:"error,omitempty"`
}

// EventsAPIHandler handles the events API requests
type EventsAPIHandler struct {
	Env engine.Env
}

// NewEventsAPIHandler creates a new events API handler
func NewEventsAPIHandler(env engine.Env) *EventsAPIHandler {
	return &EventsAPIHandler{Env: env}
}

// RegisterRoutes registers the events API routes
func (h *EventsAPIHandler) RegisterRoutes(handler *httputils.Handler) {
	apiRouter := handler.Router.PathPrefix("/api/v1").Subrouter()
	apiRouter.HandleFunc("/events", h.HandleGetEvents).Methods(http.MethodGet)
	apiRouter.HandleFunc("/events/today", h.HandleGetTodayEvents).Methods(http.MethodGet)
	apiRouter.HandleFunc("/events/tomorrow", h.HandleGetTomorrowEvents).Methods(http.MethodGet)
	apiRouter.HandleFunc("/events/week", h.HandleGetWeekEvents).Methods(http.MethodGet)
}

// HandleGetEvents handles GET /api/v1/events
func (h *EventsAPIHandler) HandleGetEvents(w http.ResponseWriter, r *http.Request) {
	mattermostUserID := r.Header.Get("Mattermost-User-Id")
	if mattermostUserID == "" {
		httputils.WriteJSONResponse(w, &EventsResponse{Error: "Not authorized"}, http.StatusUnauthorized)
		return
	}

	rangeParam := r.URL.Query().Get("range")
	if rangeParam == "" {
		rangeParam = "today"
	}

	var from, to time.Time
	now := time.Now()

	switch rangeParam {
	case "today":
		from = startOfDay(now)
		to = endOfDay(now)
	case "tomorrow":
		tomorrow := now.AddDate(0, 0, 1)
		from = startOfDay(tomorrow)
		to = endOfDay(tomorrow)
	case "week":
		from = startOfDay(now)
		to = endOfDay(now.AddDate(0, 0, 7))
	default:
		from = startOfDay(now)
		to = endOfDay(now)
	}

	events, err := h.getEventsForUser(mattermostUserID, from, to)
	if err != nil {
		httputils.WriteJSONResponse(w, &EventsResponse{Error: err.Error()}, http.StatusInternalServerError)
		return
	}

	httputils.WriteJSONResponse(w, &EventsResponse{
		Events: events,
	}, http.StatusOK)
}

// HandleGetTodayEvents handles GET /api/v1/events/today
func (h *EventsAPIHandler) HandleGetTodayEvents(w http.ResponseWriter, r *http.Request) {
	r.URL.RawQuery = "range=today"
	h.HandleGetEvents(w, r)
}

// HandleGetTomorrowEvents handles GET /api/v1/events/tomorrow
func (h *EventsAPIHandler) HandleGetTomorrowEvents(w http.ResponseWriter, r *http.Request) {
	r.URL.RawQuery = "range=tomorrow"
	h.HandleGetEvents(w, r)
}

// HandleGetWeekEvents handles GET /api/v1/events/week
func (h *EventsAPIHandler) HandleGetWeekEvents(w http.ResponseWriter, r *http.Request) {
	r.URL.RawQuery = "range=week"
	h.HandleGetEvents(w, r)
}

func (h *EventsAPIHandler) getEventsForUser(mattermostUserID string, from, to time.Time) ([]*EventDTO, error) {
	user := engine.NewUser(mattermostUserID)
	mscal := engine.New(h.Env, mattermostUserID)

	events, err := mscal.ViewCalendar(user, from, to)
	if err != nil {
		return nil, err
	}

	// Convert to DTO
	dtos := make([]*EventDTO, 0, len(events))
	for _, event := range events {
		dto := convertEventToDTO(event)
		dtos = append(dtos, dto)
	}

	return dtos, nil
}

func startOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

func endOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 999999999, t.Location())
}

func convertEventToDTO(event *remote.Event) *EventDTO {
	dto := &EventDTO{
		ID:       event.ID,
		Subject:  event.Subject,
		IsAllDay: event.IsAllDay,
		WebLink:  event.Weblink,
	}

	if event.Start != nil {
		dto.Start = event.Start.Time().Format(time.RFC3339)
	}
	if event.End != nil {
		dto.End = event.End.Time().Format(time.RFC3339)
	}
	if event.Location != nil {
		dto.Location = event.Location.DisplayName
	}
	if event.Organizer != nil && event.Organizer.EmailAddress != nil {
		dto.Organizer = event.Organizer.EmailAddress.Name
	}
	if event.Body != nil {
		dto.Description = event.Body.Content
	}
	if event.Conference != nil {
		dto.Conference = event.Conference.URL
	}

	return dto
}

// HandleCreateEvent handles POST /api/v1/events/create
func (h *EventsAPIHandler) HandleCreateEvent(w http.ResponseWriter, r *http.Request) {
	mattermostUserID := r.Header.Get("Mattermost-User-Id")
	if mattermostUserID == "" {
		httputils.WriteJSONResponse(w, &CreateEventResponse{Error: "Not authorized"}, http.StatusUnauthorized)
		return
	}

	var req CreateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputils.WriteJSONResponse(w, &CreateEventResponse{Error: "Invalid request body"}, http.StatusBadRequest)
		return
	}

	if req.Subject == "" {
		httputils.WriteJSONResponse(w, &CreateEventResponse{Error: "Subject is required"}, http.StatusBadRequest)
		return
	}

	// Parse date and times
	startTime, endTime, err := parseDateTimes(req.Date, req.StartTime, req.EndTime, req.AllDay)
	if err != nil {
		httputils.WriteJSONResponse(w, &CreateEventResponse{Error: err.Error()}, http.StatusBadRequest)
		return
	}

	// Build description with Mattermost Calls link if requested
	description := req.Description
	callLink := ""
	if req.AddMattermostCall {
		// Get site URL from config
		siteURL := h.Env.Config.PluginURL
		if siteURL == "" {
			// Fallback to a relative URL
			callLink = "/plugins/com.fambear.calls/new"
		} else {
			callLink = fmt.Sprintf("%s/plugins/com.fambear.calls/new", siteURL)
		}
		
		// Add call link to description
		if description != "" {
			description = description + "\n\n"
		}
		description = description + "📞 Join Mattermost Call: " + callLink
	}

	// Create event
	event := &remote.Event{
		Subject:  req.Subject,
		IsAllDay: req.AllDay,
		Start:    remote.NewDateTime(startTime, ""),
		End:      remote.NewDateTime(endTime, ""),
	}

	if req.Location != "" {
		event.Location = &remote.Location{DisplayName: req.Location}
	}

	if description != "" {
		event.Body = &remote.ItemBody{Content: description, ContentType: "text"}
	}

	// Add attendees
	if len(req.Attendees) > 0 {
		attendees := make([]*remote.Attendee, 0, len(req.Attendees))
		for _, email := range req.Attendees {
			attendees = append(attendees, &remote.Attendee{
				EmailAddress: &remote.EmailAddress{Address: email},
			})
		}
		event.Attendees = attendees
	}

	// Create the event using the engine
	mscal := engine.New(h.Env, mattermostUserID)
	user := engine.NewUser(mattermostUserID)
	
	// Pass attendee Mattermost user IDs for notifications
	createdEvent, err := mscal.CreateEvent(user, event, req.Attendees)
	if err != nil {
		httputils.WriteJSONResponse(w, &CreateEventResponse{Error: err.Error()}, http.StatusInternalServerError)
		return
	}

	httputils.WriteJSONResponse(w, &CreateEventResponse{
		Event:    convertEventToDTO(createdEvent),
		CallLink: callLink,
	}, http.StatusOK)
}

func parseDateTimes(dateStr, startTimeStr, endTimeStr string, allDay bool) (time.Time, time.Time, error) {
	if dateStr == "" {
		return time.Time{}, time.Time{}, fmt.Errorf("date is required")
	}

	// Parse date
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("invalid date format: %v", err)
	}

	if allDay {
		// All day event
		start := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.Local)
		end := time.Date(date.Year(), date.Month(), date.Day(), 23, 59, 59, 0, time.Local)
		return start, end, nil
	}

	if startTimeStr == "" || endTimeStr == "" {
		return time.Time{}, time.Time{}, fmt.Errorf("start_time and end_time are required for non-all-day events")
	}

	// Parse times (format: "15:04" or "3:04 PM")
	startTime, err := parseTimeString(startTimeStr)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("invalid start_time: %v", err)
	}

	endTime, err := parseTimeString(endTimeStr)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("invalid end_time: %v", err)
	}

	start := time.Date(date.Year(), date.Month(), date.Day(), startTime.Hour(), startTime.Minute(), 0, 0, time.Local)
	end := time.Date(date.Year(), date.Month(), date.Day(), endTime.Hour(), endTime.Minute(), 0, 0, time.Local)

	return start, end, nil
}

func parseTimeString(timeStr string) (time.Time, error) {
	// Try 24-hour format first
	t, err := time.Parse("15:04", timeStr)
	if err == nil {
		return t, nil
	}

	// Try 12-hour format
	t, err = time.Parse("3:04 PM", timeStr)
	if err == nil {
		return t, nil
	}

	t, err = time.Parse("3:04PM", timeStr)
	if err == nil {
		return t, nil
	}

	return time.Time{}, fmt.Errorf("cannot parse time: %s", timeStr)
}

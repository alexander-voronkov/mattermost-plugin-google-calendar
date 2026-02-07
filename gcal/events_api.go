// Copyright (c) 2019-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package gcal

import (
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

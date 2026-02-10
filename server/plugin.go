// Copyright (c) 2019-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"fmt"
	"net/http"
	"strings"
	"sync"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/people/v1"

	"github.com/alexander-voronkov/mattermost-plugin-google-calendar/gcal"
	"github.com/mattermost/mattermost-plugin-mscalendar/calendar/config"
	"github.com/mattermost/mattermost-plugin-mscalendar/calendar/engine"
	baseplugin "github.com/mattermost/mattermost-plugin-mscalendar/calendar/plugin"
)

// Plugin wraps the base mscalendar plugin to add events API
type Plugin struct {
	*baseplugin.Plugin

	envLock   sync.RWMutex
	eventsAPI *gcal.EventsAPIHandler
	env       engine.Env
}

// NewPlugin creates a new plugin instance
func NewPlugin(env engine.Env) *Plugin {
	return &Plugin{
		Plugin: baseplugin.NewWithEnv(env),
		env:    env,
	}
}

// OnActivate is called when the plugin is activated
func (p *Plugin) OnActivate() error {
	err := p.Plugin.OnActivate()
	if err != nil {
		return err
	}

	// Initialize events API handler
	p.envLock.Lock()
	p.eventsAPI = gcal.NewEventsAPIHandler(p.env)
	p.envLock.Unlock()

	return nil
}

// OnConfigurationChange is called when config changes
func (p *Plugin) OnConfigurationChange() error {
	err := p.Plugin.OnConfigurationChange()
	if err != nil {
		return err
	}

	// Update events API handler with new env
	p.envLock.Lock()
	p.eventsAPI = gcal.NewEventsAPIHandler(p.env)
	p.envLock.Unlock()

	return nil
}

// handleOAuth2Connect intercepts the OAuth connect flow to add prompt=consent
// This ensures Google always returns a refresh token, not just on first auth
func (p *Plugin) handleOAuth2Connect(w http.ResponseWriter, r *http.Request) {
	mattermostUserID := r.Header.Get("Mattermost-User-ID")
	if mattermostUserID == "" {
		http.Error(w, "Not authorized", http.StatusUnauthorized)
		return
	}

	// Check if user is already connected
	user, err := p.env.Store.LoadUser(mattermostUserID)
	if err == nil && user != nil {
		http.Error(w, fmt.Sprintf(`{"error":"user is already connected to %s"}`, user.Remote.Mail), http.StatusBadRequest)
		return
	}

	// Create OAuth2 config
	pluginURL := p.env.Config.PluginURL
	conf := &oauth2.Config{
		ClientID:     p.env.Config.OAuth2ClientID,
		ClientSecret: p.env.Config.OAuth2ClientSecret,
		RedirectURL:  pluginURL + config.FullPathOAuth2Redirect,
		Scopes: []string{
			calendar.CalendarScope,
			calendar.CalendarSettingsReadonlyScope,
			people.UserinfoEmailScope,
			people.UserinfoProfileScope,
		},
		Endpoint: google.Endpoint,
	}

	// Generate state
	state := fmt.Sprintf("%v_%v", model.NewId()[0:15], mattermostUserID)
	err = p.env.Store.StoreOAuth2State(state)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Generate auth URL with prompt=consent to always get refresh token
	url := conf.AuthCodeURL(state,
		oauth2.AccessTypeOffline,
		oauth2.SetAuthURLParam("prompt", "consent"),
	)

	http.Redirect(w, r, url, http.StatusFound)
}

// ServeHTTP handles HTTP requests
func (p *Plugin) ServeHTTP(c *plugin.Context, w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	// Intercept OAuth connect to add prompt=consent for refresh token
	if path == "/oauth2/connect" {
		p.handleOAuth2Connect(w, r)
		return
	}

	// Handle events API routes
	if strings.HasPrefix(path, "/api/v1/events") {
		p.envLock.RLock()
		handler := p.eventsAPI
		p.envLock.RUnlock()

		if handler != nil {
			switch path {
			case "/api/v1/events":
				w.Header().Set("Content-Type", "application/json")
				handler.HandleGetEvents(w, r)
				return
			case "/api/v1/events/today":
				w.Header().Set("Content-Type", "application/json")
				handler.HandleGetTodayEvents(w, r)
				return
			case "/api/v1/events/tomorrow":
				w.Header().Set("Content-Type", "application/json")
				handler.HandleGetTomorrowEvents(w, r)
				return
			case "/api/v1/events/week":
				w.Header().Set("Content-Type", "application/json")
				handler.HandleGetWeekEvents(w, r)
				return
			case "/api/v1/events/create":
				w.Header().Set("Content-Type", "application/json")
				handler.HandleCreateEvent(w, r)
				return
			}
		}
	}

	// Delegate to base plugin for all other routes
	p.Plugin.ServeHTTP(c, w, r)
}

var BuildHash string
var BuildHashShort string
var BuildDate string

func main() {
	config.Provider = gcal.GetGcalProviderConfig()

	plugin.ClientMain(
		NewPlugin(
			engine.Env{
				Config: &config.Config{
					PluginID:       manifest.Id,
					PluginVersion:  manifest.Version,
					BuildHash:      BuildHash,
					BuildHashShort: BuildHashShort,
					BuildDate:      BuildDate,
					Provider:       config.Provider,
				},
				Dependencies: &engine.Dependencies{},
			}))
}

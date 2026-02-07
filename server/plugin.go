// Copyright (c) 2019-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"net/http"
	"strings"
	"sync"

	"github.com/mattermost/mattermost/server/public/plugin"

	"github.com/alexander-voronkov/mattermost-plugin-google-calendar/gcal"
	"github.com/mattermost/mattermost-plugin-mscalendar/calendar/config"
	"github.com/mattermost/mattermost-plugin-mscalendar/calendar/engine"
	baseplugin "github.com/mattermost/mattermost-plugin-mscalendar/calendar/plugin"
)

// Plugin wraps the base mscalendar plugin to add events API
type Plugin struct {
	*baseplugin.Plugin
	
	envLock     sync.RWMutex
	eventsAPI   *gcal.EventsAPIHandler
	env         engine.Env
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

// ServeHTTP handles HTTP requests
func (p *Plugin) ServeHTTP(c *plugin.Context, w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	
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

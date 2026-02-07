import React, {useEffect} from 'react';

import {Store, Action} from 'redux';

import {GlobalState} from '@mattermost/types/lib/store';

import {PluginRegistry} from '@/types/mattermost-webapp';

import {PluginId} from './plugin_id';

import Hooks from './plugin_hooks';
import reducer from './reducers';

import CreateEventModal from './components/modals/create_event_modal';
import CalendarRHS from './components/rhs/calendar_rhs';
import {getProviderConfiguration, handleConnectChange, openCreateEventModal} from './actions';

// eslint-disable-next-line @typescript-eslint/no-empty-function
export default class Plugin {
    private haveSetupUI = false;

    private finishedSetupUI = () => {
        this.haveSetupUI = true;
    };

    public async initialize(registry: PluginRegistry, store: Store<GlobalState, Action<Record<string, unknown>>>) {
        this.haveSetupUI = false;

        registry.registerReducer(reducer);

        const hooks = new Hooks(store);
        registry.registerSlashCommandWillBePostedHook(hooks.slashCommandWillBePostedHook);

        const setup = async () => {
            // Retrieve provider configuration so we can access names and other options in messages to use in the frontend.
            await store.dispatch(getProviderConfiguration());

            // Register app bar button with RHS component
            // Using data URL because Mattermost doesn't serve plugin assets directly
            const iconDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAB3UlEQVR4Ae2WA4ydQRSFq7hxbdsOardhGTaqbdtug9q2G9bm2rZt79k9Se7anNmdL/mt8w3uew0MdRCDYdxeNJlwKGHPhEPxdtkLamJpvcS2yKXNEps3rRbbzSyXwMRDcSvkxbUtIEurxbYryizAlldLgIuNVXkEoJoAFyNgBIxALkagqkl736S0RWkBI2AEnlkkYcG1KEw/G4FFt6LxxzMVRREYnY4dz2Nx/0+iOgJ3fiaizYZgcOmwKXf71iYZeXnvmIx+u0PB62sfxqghEJ+ciZGHwtBrZwisfVORnJYJti5DTjgRDoGtLpJKCZC0DMArLD3fcfftIei8JQTC7PORmHwqnHLqCeSFPXDlawIYknNCCInNAMV+uqeoK7DsTjTY8gw45lg4GDo/GgjIJOWc+OScopeAwBLK8c9KFBGfob4AQ7K+52Xj4xgG5e+D2gIMxNaefzESeWHFYdBvrilqCxBWG4Zi6D0vY1n/eYxBe0NZlZQXYLWRFpeFxxxWek1i+4A0Vh4KmX+jWgsYgVZ7R6G0ZdjD2VW6hE4cXvIyafgZbQUkvJYCEl5LAQmvpYCE10yg8uFFIK52BCofXgRu1IKAhK88zfeOa9pq36gt2UG9akyA4esfBoMhCz+uoIWaiQpKAAAAAElFTkSuQmCC';
            registry.registerAppBarComponent(
                iconDataUrl,
                null, // action - null when using rhsComponent
                'Google Calendar', // tooltipText
                null, // supportedProductIds
                CalendarRHS, // rhsComponent
                'Google Calendar', // rhsTitle
            );

            registry.registerChannelHeaderMenuAction(
                <span>{'Create calendar event'}</span>,
                async (channelID) => {
                    if (await hooks.checkUserIsConnected()) {
                        store.dispatch(openCreateEventModal(channelID));
                    }
                },
            );

            registry.registerRootComponent(CreateEventModal);

            registry.registerWebSocketEventHandler(`custom_${PluginId}_connected`, handleConnectChange(store));
            registry.registerWebSocketEventHandler(`custom_${PluginId}_disconnected`, handleConnectChange(store));
        };

        registry.registerRootComponent(() => (
            <SetupUI
                setup={setup}
                haveSetupUI={this.haveSetupUI}
                finishedSetupUI={this.finishedSetupUI}
            />
        ));

        // reminder to set up site url for any API calls
        // and i18n
    }
}

interface SetupUIProps {
    setup: () => Promise<void>;
    haveSetupUI: boolean;
    finishedSetupUI: () => void;
}

const SetupUI = ({setup, haveSetupUI, finishedSetupUI}: SetupUIProps) => {
    useEffect(() => {
        if (!haveSetupUI) {
            setup().then(() => {
                finishedSetupUI();
            });
        }
    }, []);

    return null;
};

declare global {
    interface Window {
        registerPlugin(pluginId: string, plugin: Plugin): void
    }
}

window.registerPlugin(PluginId, new Plugin());

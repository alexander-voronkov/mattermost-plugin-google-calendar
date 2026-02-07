export interface PluginRegistry {
    registerPostTypeComponent(typeName: string, component: React.ElementType): void;

    registerReducer(reducer: any): void;

    registerSlashCommandWillBePostedHook(hook: any): void;

    registerChannelHeaderMenuAction(text: React.ReactNode, action: (channelId: string) => void): void;

    registerRootComponent(component: React.ElementType): void;

    registerWebSocketEventHandler(event: string, handler: (msg: any) => void): void;

    registerRightHandSidebarComponent(component: React.ElementType, title: string | React.ReactNode): {id: string; showRHSPlugin: () => void};

    registerChannelHeaderButtonAction(icon: React.ReactNode, action: () => void, dropdownText: string, tooltipText: string): void;

    registerAppBarComponent(iconUrl: string, action: () => void, tooltipText: string): void;

    // Add more if needed from https://developers.mattermost.com/extend/plugins/webapp/reference
}

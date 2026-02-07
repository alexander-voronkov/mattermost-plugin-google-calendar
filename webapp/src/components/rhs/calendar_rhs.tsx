import React, {useEffect, useState, useCallback} from 'react';
import {useSelector} from 'react-redux';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {GlobalState} from '@mattermost/types/lib/store';

import {PluginId} from '../../plugin_id';
import {doFetch} from '../../client';

interface UserInfo {
    connected?: boolean;
    email?: string;
    remote_id?: string;
}

const CalendarRHS: React.FC = () => {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [commandExecuting, setCommandExecuting] = useState<string | null>(null);

    const channelId = useSelector((state: GlobalState) => getCurrentChannelId(state));
    const teamId = useSelector((state: GlobalState) => getCurrentTeamId(state));

    const checkConnection = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await doFetch(`/plugins/${PluginId}/api/v1/me`, {method: 'GET'});
            setUserInfo(data || {});
        } catch (e: any) {
            if (e.status_code === 401 || e.status_code === 404) {
                setUserInfo(null);
            } else {
                setError(e.message || 'Failed to check connection');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkConnection();
    }, [checkConnection]);

    const executeCommand = async (command: string) => {
        if (!channelId) {
            return;
        }
        setCommandExecuting(command);
        try {
            await doFetch(`/api/v4/commands/execute`, {
                method: 'POST',
                body: JSON.stringify({
                    channel_id: channelId,
                    team_id: teamId,
                    command: command,
                }),
            });
        } catch (e) {
            // Command executed, response may be ephemeral
        } finally {
            setCommandExecuting(null);
        }
    };

    const isConnected = userInfo && (userInfo.remote_id || userInfo.email);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: 'var(--center-channel-bg)',
        }}>
            {/* Header */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--center-channel-color-08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
            }}>
                <h3 style={{margin: 0, fontSize: '16px', fontWeight: 600}}>
                    📅 Google Calendar
                </h3>
                <button
                    onClick={checkConnection}
                    disabled={loading}
                    style={{
                        padding: '4px 8px',
                        border: '1px solid var(--center-channel-color-16)',
                        borderRadius: '4px',
                        backgroundColor: 'transparent',
                        cursor: loading ? 'wait' : 'pointer',
                        fontSize: '13px',
                    }}
                >
                    {loading ? '⏳' : '🔄'}
                </button>
            </div>

            {/* Content */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
            }}>
                {loading && (
                    <div style={{textAlign: 'center', padding: '24px', color: 'var(--center-channel-color-56)'}}>
                        Loading...
                    </div>
                )}

                {!loading && error && (
                    <div style={{
                        padding: '12px',
                        backgroundColor: 'var(--error-text-08)',
                        borderRadius: '8px',
                        color: 'var(--error-text)',
                        fontSize: '13px',
                        marginBottom: '16px',
                    }}>
                        {error}
                    </div>
                )}

                {!loading && !isConnected && (
                    <div style={{textAlign: 'center', padding: '24px'}}>
                        <div style={{fontSize: '48px', marginBottom: '16px'}}>🔗</div>
                        <h4 style={{margin: '0 0 12px 0'}}>Connect Your Calendar</h4>
                        <p style={{
                            color: 'var(--center-channel-color-56)',
                            fontSize: '13px',
                            marginBottom: '16px',
                        }}>
                            Link your Google Calendar to see events
                        </p>
                        <button
                            onClick={() => executeCommand('/gcal connect')}
                            disabled={commandExecuting === '/gcal connect'}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: 'var(--button-bg)',
                                color: 'var(--button-color)',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 500,
                            }}
                        >
                            {commandExecuting === '/gcal connect' ? 'Connecting...' : '🔗 Connect Google Calendar'}
                        </button>
                    </div>
                )}

                {!loading && isConnected && (
                    <div>
                        {/* Connection status */}
                        <div style={{
                            padding: '10px 12px',
                            backgroundColor: 'var(--center-channel-color-04)',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <span style={{color: '#3db887'}}>✓</span>
                            <span style={{fontSize: '13px'}}>
                                {userInfo?.email || 'Connected'}
                            </span>
                        </div>

                        {/* Action buttons */}
                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px'}}>
                            <ActionButton
                                icon="📆"
                                label="Today's Events"
                                onClick={() => executeCommand('/gcal today')}
                                loading={commandExecuting === '/gcal today'}
                            />
                            <ActionButton
                                icon="📅"
                                label="Tomorrow's Events"
                                onClick={() => executeCommand('/gcal tomorrow')}
                                loading={commandExecuting === '/gcal tomorrow'}
                            />
                            <ActionButton
                                icon="🗓️"
                                label="This Week"
                                onClick={() => executeCommand('/gcal viewcal')}
                                loading={commandExecuting === '/gcal viewcal'}
                            />
                        </div>

                        {/* Settings */}
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'var(--center-channel-color-04)',
                            borderRadius: '8px',
                        }}>
                            <div style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                marginBottom: '8px',
                                color: 'var(--center-channel-color-72)',
                            }}>
                                Settings
                            </div>
                            <button
                                onClick={() => executeCommand('/gcal settings')}
                                disabled={commandExecuting === '/gcal settings'}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--center-channel-color-16)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    textAlign: 'left',
                                }}
                            >
                                ⚙️ Configure Preferences
                            </button>
                        </div>

                        {/* Tip */}
                        <div style={{
                            marginTop: '16px',
                            padding: '12px',
                            backgroundColor: 'var(--center-channel-color-04)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: 'var(--center-channel-color-56)',
                        }}>
                            💡 <strong>Tip:</strong> Use channel menu → "Create calendar event" to add events directly.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface ActionButtonProps {
    icon: string;
    label: string;
    onClick: () => void;
    loading?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({icon, label, onClick, loading}) => (
    <button
        onClick={onClick}
        disabled={loading}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            backgroundColor: 'var(--button-bg)',
            color: 'var(--button-color)',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'opacity 0.2s',
            opacity: loading ? 0.7 : 1,
        }}
    >
        <span style={{fontSize: '18px'}}>{icon}</span>
        <span>{loading ? 'Loading...' : label}</span>
    </button>
);

export default CalendarRHS;

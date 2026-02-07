import React, {useEffect, useState, useCallback} from 'react';

import {PluginId} from '../../plugin_id';
import {doFetch} from '../../client';

interface UserInfo {
    connected: boolean;
    email?: string;
}

const CalendarRHS: React.FC = () => {
    const [connected, setConnected] = useState<boolean | null>(null);
    const [email, setEmail] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const checkConnection = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await doFetch(`/plugins/${PluginId}/api/v1/me`, {method: 'GET'});
            if (data && data.email) {
                setConnected(true);
                setEmail(data.email);
            } else {
                setConnected(false);
            }
        } catch (e: any) {
            if (e.status_code === 401 || e.status_code === 404) {
                setConnected(false);
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

                {!loading && connected === false && (
                    <div style={{
                        textAlign: 'center',
                        padding: '24px',
                    }}>
                        <div style={{fontSize: '48px', marginBottom: '16px'}}>🔗</div>
                        <h4 style={{margin: '0 0 8px 0'}}>Connect Your Calendar</h4>
                        <p style={{
                            color: 'var(--center-channel-color-56)',
                            fontSize: '13px',
                            marginBottom: '16px',
                        }}>
                            Use the slash command to connect:
                        </p>
                        <code style={{
                            display: 'block',
                            padding: '12px',
                            backgroundColor: 'var(--center-channel-color-04)',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontFamily: 'monospace',
                        }}>
                            /gcal connect
                        </code>
                    </div>
                )}

                {!loading && connected === true && (
                    <div>
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'var(--center-channel-color-04)',
                            borderRadius: '8px',
                            marginBottom: '16px',
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '8px',
                            }}>
                                <span style={{color: '#3db887'}}>✓</span>
                                <span style={{fontWeight: 600}}>Connected</span>
                            </div>
                            {email && (
                                <div style={{
                                    fontSize: '12px',
                                    color: 'var(--center-channel-color-56)',
                                }}>
                                    {email}
                                </div>
                            )}
                        </div>

                        <h4 style={{margin: '0 0 12px 0', fontSize: '14px'}}>Quick Commands</h4>
                        
                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                            <CommandCard 
                                command="/gcal today"
                                description="View today's events"
                            />
                            <CommandCard 
                                command="/gcal tomorrow"
                                description="View tomorrow's events"
                            />
                            <CommandCard 
                                command="/gcal viewcal"
                                description="View this week's events"
                            />
                            <CommandCard 
                                command="/gcal settings"
                                description="Configure preferences"
                            />
                        </div>

                        <div style={{
                            marginTop: '24px',
                            padding: '12px',
                            backgroundColor: 'var(--center-channel-color-04)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: 'var(--center-channel-color-56)',
                        }}>
                            💡 <strong>Tip:</strong> Use the channel header menu to create calendar events directly from any channel.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface CommandCardProps {
    command: string;
    description: string;
}

const CommandCard: React.FC<CommandCardProps> = ({command, description}) => (
    <div style={{
        padding: '10px 12px',
        backgroundColor: 'var(--center-channel-color-04)',
        borderRadius: '6px',
        border: '1px solid var(--center-channel-color-08)',
    }}>
        <code style={{
            fontSize: '13px',
            fontFamily: 'monospace',
            color: 'var(--button-bg)',
        }}>
            {command}
        </code>
        <div style={{
            fontSize: '12px',
            color: 'var(--center-channel-color-56)',
            marginTop: '4px',
        }}>
            {description}
        </div>
    </div>
);

export default CalendarRHS;

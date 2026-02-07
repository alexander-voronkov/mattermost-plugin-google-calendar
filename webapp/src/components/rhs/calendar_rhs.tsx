import React, {useEffect, useState, useCallback} from 'react';

import {PluginId} from '../../plugin_id';
import {doFetch} from '../../client';

interface CalendarEvent {
    id: string;
    subject: string;
    start: string;
    end: string;
    location?: string;
    isAllDay: boolean;
    webLink?: string;
    organizer?: string;
    conference?: string;
}

interface EventsResponse {
    events: CalendarEvent[];
    error?: string;
}

type ViewType = 'today' | 'tomorrow' | 'week';

const formatTime = (dateStr: string, isAllDay: boolean): string => {
    if (isAllDay) {
        return 'All day';
    }
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
};

const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'});
};

const CalendarRHS: React.FC = () => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<ViewType>('today');
    const [connected, setConnected] = useState<boolean | null>(null);

    const fetchEvents = useCallback(async (viewType: ViewType) => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = viewType === 'week' ? 'week' : viewType;
            const data: EventsResponse = await doFetch(`/plugins/${PluginId}/api/v1/events/${endpoint}`, {method: 'GET'});
            
            if (data.error) {
                if (data.error.includes('not connected') || data.error.includes('user not found') || data.error.includes('token')) {
                    setConnected(false);
                    setError('Connect your Google Calendar to see events');
                } else {
                    setError(data.error);
                }
                setEvents([]);
            } else {
                setConnected(true);
                setEvents(data.events || []);
            }
        } catch (e: any) {
            if (e.status_code === 401 || e.status_code === 404) {
                setConnected(false);
                setError('Connect your Google Calendar to see events');
            } else {
                setError(e.message || 'Failed to fetch events');
            }
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents(view);
    }, [view, fetchEvents]);

    const getViewTitle = (): string => {
        const today = new Date();
        switch (view) {
            case 'today':
                return formatDate(today.toISOString());
            case 'tomorrow':
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return formatDate(tomorrow.toISOString());
            case 'week':
                return 'This Week';
            default:
                return '';
        }
    };

    const handleConnect = async () => {
        try {
            await doFetch(`/api/v4/commands/execute`, {
                method: 'POST',
                body: JSON.stringify({
                    channel_id: '',
                    command: '/gcal connect',
                }),
            });
        } catch (e) {
            // Command executed
        }
    };

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
                    📅 {getViewTitle()}
                </h3>
                <button
                    onClick={() => fetchEvents(view)}
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

            {/* View Tabs */}
            <div style={{
                display: 'flex',
                borderBottom: '1px solid var(--center-channel-color-08)',
                flexShrink: 0,
            }}>
                {(['today', 'tomorrow', 'week'] as ViewType[]).map((v) => (
                    <button
                        key={v}
                        onClick={() => setView(v)}
                        style={{
                            flex: 1,
                            padding: '10px 12px',
                            border: 'none',
                            borderBottom: view === v ? '2px solid var(--button-bg)' : '2px solid transparent',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: view === v ? 600 : 400,
                            color: view === v ? 'var(--button-bg)' : 'var(--center-channel-color)',
                        }}
                    >
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 16px',
            }}>
                {loading && (
                    <div style={{textAlign: 'center', padding: '32px', color: 'var(--center-channel-color-56)'}}>
                        <div style={{fontSize: '24px', marginBottom: '8px'}}>⏳</div>
                        Loading events...
                    </div>
                )}

                {!loading && connected === false && (
                    <div style={{textAlign: 'center', padding: '32px'}}>
                        <div style={{fontSize: '48px', marginBottom: '16px'}}>🔗</div>
                        <h4 style={{margin: '0 0 12px 0'}}>Connect Your Calendar</h4>
                        <p style={{
                            color: 'var(--center-channel-color-56)',
                            fontSize: '13px',
                            marginBottom: '16px',
                        }}>
                            Link your Google Calendar to see your events here
                        </p>
                        <button
                            onClick={handleConnect}
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
                            🔗 Connect Google Calendar
                        </button>
                    </div>
                )}

                {!loading && connected && error && (
                    <div style={{
                        padding: '12px',
                        backgroundColor: 'var(--error-text-08)',
                        borderRadius: '8px',
                        color: 'var(--error-text)',
                        fontSize: '13px',
                        marginBottom: '12px',
                    }}>
                        {error}
                    </div>
                )}

                {!loading && connected && !error && events.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '32px',
                        color: 'var(--center-channel-color-56)',
                    }}>
                        <div style={{fontSize: '48px', marginBottom: '12px'}}>🎉</div>
                        <div style={{fontSize: '14px', fontWeight: 500}}>No events</div>
                        <div style={{fontSize: '13px', marginTop: '4px'}}>
                            {view === 'today' ? 'Your day is free!' : 
                             view === 'tomorrow' ? 'Tomorrow is clear!' : 
                             'Nothing scheduled this week'}
                        </div>
                    </div>
                )}

                {!loading && connected && events.length > 0 && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        {events.map((event) => (
                            <EventCard key={event.id} event={event} showDate={view === 'week'} />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer - Create Event hint */}
            {connected && (
                <div style={{
                    padding: '10px 16px',
                    borderTop: '1px solid var(--center-channel-color-08)',
                    fontSize: '11px',
                    color: 'var(--center-channel-color-40)',
                    textAlign: 'center',
                    flexShrink: 0,
                }}>
                    💡 Channel menu → Create calendar event
                </div>
            )}
        </div>
    );
};

interface EventCardProps {
    event: CalendarEvent;
    showDate?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({event, showDate}) => {
    const startTime = formatTime(event.start, event.isAllDay);
    const endTime = formatTime(event.end, event.isAllDay);

    return (
        <div style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: 'var(--center-channel-color-04)',
            border: '1px solid var(--center-channel-color-08)',
        }}>
            {/* Time */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: 'var(--center-channel-color-56)',
                marginBottom: '6px',
            }}>
                <span>🕐</span>
                <span>{event.isAllDay ? 'All day' : `${startTime} - ${endTime}`}</span>
                {showDate && (
                    <>
                        <span style={{color: 'var(--center-channel-color-24)'}}>•</span>
                        <span>{formatDate(event.start)}</span>
                    </>
                )}
            </div>

            {/* Title */}
            <div style={{
                fontWeight: 600,
                fontSize: '14px',
                marginBottom: event.location || event.conference ? '6px' : 0,
            }}>
                {event.webLink ? (
                    <a
                        href={event.webLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            color: 'var(--link-color)',
                            textDecoration: 'none',
                        }}
                    >
                        {event.subject || '(No title)'}
                    </a>
                ) : (
                    <span>{event.subject || '(No title)'}</span>
                )}
            </div>

            {/* Location */}
            {event.location && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: 'var(--center-channel-color-56)',
                }}>
                    <span>📍</span>
                    <span>{event.location}</span>
                </div>
            )}

            {/* Conference link */}
            {event.conference && (
                <div style={{marginTop: '8px'}}>
                    <a
                        href={event.conference}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            backgroundColor: 'var(--button-bg)',
                            color: 'var(--button-color)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                            textDecoration: 'none',
                        }}
                    >
                        🎥 Join Meeting
                    </a>
                </div>
            )}
        </div>
    );
};

export default CalendarRHS;

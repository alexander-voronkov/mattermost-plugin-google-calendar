import React, {useEffect, useState, useCallback} from 'react';
import {useDispatch} from 'react-redux';

import {PluginId} from '../../plugin_id';
import {doFetch} from '../../client';
import {openCreateEventModal} from '../../actions';

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
    const dispatch = useDispatch();

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

    const handleConnect = () => {
        // Open OAuth connect URL in new browser tab
        const connectUrl = `/plugins/${PluginId}/oauth2/connect`;
        window.open(connectUrl, '_blank', 'noopener,noreferrer');
    };

    // Show full-screen connect prompt when not connected
    if (!loading && connected === false) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                backgroundColor: 'var(--center-channel-bg)',
            }}>
                <ConnectScreen onConnect={handleConnect} />
            </div>
        );
    }

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

            {/* Footer - Create Meeting Button */}
            {connected && (
                <div style={{
                    padding: '12px 16px',
                    borderTop: '1px solid var(--center-channel-color-08)',
                    flexShrink: 0,
                }}>
                    <button
                        onClick={() => dispatch(openCreateEventModal(''))}
                        style={{
                            width: '100%',
                            padding: '10px 16px',
                            backgroundColor: 'var(--button-bg)',
                            color: 'var(--button-color)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                        }}
                    >
                        <span>➕</span>
                        <span>Create Meeting</span>
                    </button>
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

// Google Calendar Logo SVG
const GoogleCalendarLogo: React.FC = () => (
    <svg width="80" height="80" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <rect x="40" y="40" width="120" height="120" rx="12" fill="#fff" stroke="#e0e0e0" strokeWidth="2"/>
        <rect x="40" y="40" width="120" height="30" rx="12" fill="#4285F4"/>
        <rect x="40" y="58" width="120" height="12" fill="#4285F4"/>
        <circle cx="70" cy="55" r="6" fill="#fff"/>
        <circle cx="130" cy="55" r="6" fill="#fff"/>
        <rect x="60" y="90" width="25" height="25" rx="3" fill="#EA4335"/>
        <rect x="90" y="90" width="25" height="25" rx="3" fill="#FBBC04"/>
        <rect x="120" y="90" width="25" height="25" rx="3" fill="#34A853"/>
        <rect x="60" y="120" width="25" height="25" rx="3" fill="#4285F4"/>
        <rect x="90" y="120" width="25" height="25" rx="3" fill="#EA4335"/>
        <rect x="120" y="120" width="25" height="25" rx="3" fill="#FBBC04"/>
    </svg>
);

// Connect Screen Component
interface ConnectScreenProps {
    onConnect: () => void;
}

const ConnectScreen: React.FC<ConnectScreenProps> = ({onConnect}) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '32px 24px',
        textAlign: 'center',
    }}>
        <GoogleCalendarLogo />
        
        <h3 style={{
            margin: '24px 0 12px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--center-channel-color)',
        }}>
            Google Calendar
        </h3>
        
        <p style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            color: 'var(--center-channel-color-64)',
            lineHeight: 1.5,
        }}>
            View your upcoming events, create meetings, and stay organized — all within Mattermost.
        </p>
        
        <p style={{
            margin: '0 0 24px 0',
            fontSize: '13px',
            color: 'var(--center-channel-color-48)',
        }}>
            Connect your Google account to get started.
        </p>
        
        <button
            onClick={onConnect}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 24px',
                backgroundColor: '#4285F4',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: 500,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3367D6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4285F4'}
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
        </button>
        
        <p style={{
            marginTop: '20px',
            fontSize: '11px',
            color: 'var(--center-channel-color-40)',
        }}>
            Opens in a new browser tab
        </p>
    </div>
);

export default CalendarRHS;

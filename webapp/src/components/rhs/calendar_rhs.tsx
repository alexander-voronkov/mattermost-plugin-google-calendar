import React, {useEffect, useState, useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';

import {GlobalState} from '@mattermost/types/lib/store';

import {PluginId} from '../../plugin_id';
import {doFetch} from '../../client';

interface CalendarEvent {
    id: string;
    subject: string;
    start: string;
    end: string;
    location?: string;
    htmlLink?: string;
    allDay?: boolean;
}

interface ViewResponse {
    events: CalendarEvent[];
    error?: string;
}

type ViewType = 'today' | 'tomorrow' | 'week';

const formatTime = (dateStr: string, allDay?: boolean): string => {
    if (allDay) {
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
    const [connected, setConnected] = useState(false);

    const fetchEvents = useCallback(async (viewType: ViewType) => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = viewType === 'week' ? 'viewcal' : viewType;
            const data = await doFetch(`/plugins/${PluginId}/api/v1/${endpoint}`, {method: 'GET'});
            
            if (data.error) {
                if (data.error.includes('not connected') || data.error.includes('connect')) {
                    setConnected(false);
                    setError('Please connect your Google Calendar first. Use /gcal connect');
                } else {
                    setError(data.error);
                }
                setEvents([]);
            } else {
                setConnected(true);
                setEvents(data.events || []);
            }
        } catch (e: any) {
            if (e.status_code === 401 || e.message?.includes('not connected')) {
                setConnected(false);
                setError('Please connect your Google Calendar. Use /gcal connect');
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

    const handleRefresh = () => {
        fetchEvents(view);
    };

    const getViewTitle = (): string => {
        switch (view) {
            case 'today':
                return 'Today';
            case 'tomorrow':
                return 'Tomorrow';
            case 'week':
                return 'This Week';
            default:
                return '';
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
                    onClick={handleRefresh}
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
                            padding: '8px 12px',
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
                    }}>
                        {error}
                    </div>
                )}

                {!loading && !error && events.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '24px',
                        color: 'var(--center-channel-color-56)',
                    }}>
                        <div style={{fontSize: '32px', marginBottom: '8px'}}>🎉</div>
                        <div>No events scheduled</div>
                    </div>
                )}

                {!loading && !error && events.map((event) => (
                    <div
                        key={event.id}
                        style={{
                            padding: '12px',
                            marginBottom: '8px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--center-channel-color-04)',
                            border: '1px solid var(--center-channel-color-08)',
                        }}
                    >
                        <div style={{
                            fontWeight: 600,
                            fontSize: '14px',
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                        }}>
                            {event.htmlLink ? (
                                <a
                                    href={event.htmlLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{color: 'var(--link-color)', textDecoration: 'none'}}
                                >
                                    {event.subject}
                                </a>
                            ) : (
                                <span>{event.subject}</span>
                            )}
                        </div>
                        <div style={{
                            fontSize: '12px',
                            color: 'var(--center-channel-color-56)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <span>🕐 {formatTime(event.start, event.allDay)}</span>
                            {!event.allDay && (
                                <>
                                    <span>→</span>
                                    <span>{formatTime(event.end)}</span>
                                </>
                            )}
                        </div>
                        {view === 'week' && (
                            <div style={{
                                fontSize: '11px',
                                color: 'var(--center-channel-color-40)',
                                marginTop: '4px',
                            }}>
                                📆 {formatDate(event.start)}
                            </div>
                        )}
                        {event.location && (
                            <div style={{
                                fontSize: '12px',
                                color: 'var(--center-channel-color-56)',
                                marginTop: '4px',
                            }}>
                                📍 {event.location}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer */}
            {connected && (
                <div style={{
                    padding: '8px 16px',
                    borderTop: '1px solid var(--center-channel-color-08)',
                    fontSize: '11px',
                    color: 'var(--center-channel-color-40)',
                    textAlign: 'center',
                    flexShrink: 0,
                }}>
                    ✅ Connected to Google Calendar
                </div>
            )}
        </div>
    );
};

export default CalendarRHS;

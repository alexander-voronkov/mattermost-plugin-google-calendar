import React from 'react';

const CalendarRHS: React.FC = () => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: 'var(--center-channel-bg)',
            padding: '16px',
        }}>
            <h3 style={{margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600}}>
                📅 Google Calendar
            </h3>
            
            <div style={{
                padding: '16px',
                backgroundColor: 'var(--center-channel-color-04)',
                borderRadius: '8px',
                marginBottom: '16px',
            }}>
                <h4 style={{margin: '0 0 12px 0', fontSize: '14px'}}>Quick Commands</h4>
                
                <div style={{marginBottom: '8px'}}>
                    <code style={{
                        display: 'block',
                        padding: '8px',
                        backgroundColor: 'var(--center-channel-bg)',
                        borderRadius: '4px',
                        fontSize: '13px',
                        marginBottom: '4px',
                    }}>
                        /gcal connect
                    </code>
                    <span style={{fontSize: '12px', color: 'var(--center-channel-color-56)'}}>
                        Connect your Google Calendar
                    </span>
                </div>

                <div style={{marginBottom: '8px'}}>
                    <code style={{
                        display: 'block',
                        padding: '8px',
                        backgroundColor: 'var(--center-channel-bg)',
                        borderRadius: '4px',
                        fontSize: '13px',
                        marginBottom: '4px',
                    }}>
                        /gcal today
                    </code>
                    <span style={{fontSize: '12px', color: 'var(--center-channel-color-56)'}}>
                        View today's events
                    </span>
                </div>

                <div style={{marginBottom: '8px'}}>
                    <code style={{
                        display: 'block',
                        padding: '8px',
                        backgroundColor: 'var(--center-channel-bg)',
                        borderRadius: '4px',
                        fontSize: '13px',
                        marginBottom: '4px',
                    }}>
                        /gcal tomorrow
                    </code>
                    <span style={{fontSize: '12px', color: 'var(--center-channel-color-56)'}}>
                        View tomorrow's events
                    </span>
                </div>

                <div>
                    <code style={{
                        display: 'block',
                        padding: '8px',
                        backgroundColor: 'var(--center-channel-bg)',
                        borderRadius: '4px',
                        fontSize: '13px',
                        marginBottom: '4px',
                    }}>
                        /gcal viewcal
                    </code>
                    <span style={{fontSize: '12px', color: 'var(--center-channel-color-56)'}}>
                        View this week's events
                    </span>
                </div>
            </div>

            <div style={{
                padding: '12px',
                backgroundColor: 'var(--center-channel-color-04)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--center-channel-color-56)',
            }}>
                💡 Use channel menu → "Create calendar event" to add events
            </div>
        </div>
    );
};

export default CalendarRHS;

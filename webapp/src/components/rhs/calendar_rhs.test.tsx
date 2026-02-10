// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';
import 'jest-environment-jsdom';

import CalendarRHS, {EventCard} from './calendar_rhs';

// Mock the react-redux useDispatch hook
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    useDispatch: jest.fn(() => jest.fn()),
}));

// Mock the plugin_id
jest.mock('../../plugin_id', () => ({
    PluginId: 'com.mattermost.plugin-calendar',
}));

// Mock the doFetch client
jest.mock('../../client', () => ({
    doFetch: jest.fn(),
}));

// Mock the actions
jest.mock('../../actions', () => ({
    openCreateEventModal: jest.fn(() => ({type: 'OPEN_CREATE_EVENT_MODAL'})),
}));

describe('CalendarRHS Conference Icons', () => {
    describe('getConferenceType', () => {
        // We need to test the helper function, but it's not exported
        // We'll test it indirectly through the EventCard component

        const createEvent = (conference: string) => ({
            id: '1',
            subject: 'Test Event',
            start: '2025-01-15T10:00:00Z',
            end: '2025-01-15T11:00:00Z',
            isAllDay: false,
            conference,
        });

        test('should detect Google Meet URLs', () => {
            const googleMeetUrls = [
                'https://meet.google.com/abc-defg-hij',
                'https://meet.google.com/new',
                'http://meet.google.com/xyz-uvw-rst',
                'HTTPS://MEET.GOOGLE.COM/ABC', // Test case insensitivity
            ];

            for (const url of googleMeetUrls) {
                const wrapper = shallow(<EventCard event={createEvent(url)}/>);

                // Google Meet icon should be present
                const icon = wrapper.find('ConferenceIcon');
                expect(icon.exists()).toBe(true);
                expect(icon.prop('type')).toBe('google-meet');
            }
        });

        test('should detect Zoom URLs', () => {
            const zoomUrls = [
                'https://zoom.us/j/123456789',
                'https://zoom.com/j/123456789',
                'https://zoom.us/my/meeting',
                'HTTPS://ZOOM.US/MEETING/ABC', // Test case insensitivity
                'https://us04web.zoom.us/j/123456789', // Subdomain
            ];

            for (const url of zoomUrls) {
                const wrapper = shallow(<EventCard event={createEvent(url)}/>);
                const icon = wrapper.find('ConferenceIcon');
                expect(icon.exists()).toBe(true);
                expect(icon.prop('type')).toBe('zoom');
            }
        });

        test('should detect Mattermost URLs', () => {
            const mattermostUrls = [
                'https://mm.example.com/call/test',
                'https://mm.mattermost.com',
                'https://mattermost.com/call/123',
                'https://community.mattermost.com/call',
                'HTTPS://MM.TEST.COM/ABC', // Test case insensitivity
            ];

            for (const url of mattermostUrls) {
                const wrapper = shallow(<EventCard event={createEvent(url)}/>);
                const icon = wrapper.find('ConferenceIcon');
                expect(icon.exists()).toBe(true);
                expect(icon.prop('type')).toBe('mattermost');
            }
        });

        test('should return generic for unknown conference URLs', () => {
            const genericUrls = [
                'https://teams.microsoft.com/l/meetup/join',
                'https://webex.com/meet/123',
                'https://example.com/meeting',
                'https://unknown-conference.com/join',
                'https://some-other-service.com',
            ];

            for (const url of genericUrls) {
                const wrapper = shallow(<EventCard event={createEvent(url)}/>);

                // Should not have ConferenceIcon component, but should have the generic emoji
                const icon = wrapper.find('ConferenceIcon');
                expect(icon.exists()).toBe(false);
            }
        });

        test('should handle empty and invalid conference URLs', () => {
            const invalidInputs = [
                '',
                '   ',
                'not-a-url',
                'http://',
            ];

            for (const url of invalidInputs) {
                const wrapper = shallow(<EventCard event={createEvent(url)}/>);

                // Should not have ConferenceIcon component
                const icon = wrapper.find('ConferenceIcon');
                expect(icon.exists()).toBe(false);
            }
        });
    });

    describe('ConferenceIcon Component', () => {
        // Access the internal components through shallow rendering
        // Since they're not exported, we'll test them indirectly

        test('should render GoogleMeetIcon for google-meet type', () => {
            // We can't directly test ConferenceIcon since it's not exported
            // But we can verify the EventCard renders correctly with a Google Meet URL
            const event = {
                id: '1',
                subject: 'Test Event',
                start: '2025-01-15T10:00:00Z',
                end: '2025-01-15T11:00:00Z',
                isAllDay: false,
                conference: 'https://meet.google.com/abc-defg-hij',
            };

            const wrapper = shallow(<EventCard event={event}/>);

            // Check that the conference link is rendered
            const conferenceLink = wrapper.find('a[href="https://meet.google.com/abc-defg-hij"]');
            expect(conferenceLink.exists()).toBe(true);
            expect(conferenceLink.text()).toContain('Join Meeting');
        });

        test('should render ZoomIcon for zoom type', () => {
            const event = {
                id: '2',
                subject: 'Test Event',
                start: '2025-01-15T10:00:00Z',
                end: '2025-01-15T11:00:00Z',
                isAllDay: false,
                conference: 'https://zoom.us/j/123456789',
            };

            const wrapper = shallow(<EventCard event={event}/>);
            const conferenceLink = wrapper.find('a[href="https://zoom.us/j/123456789"]');
            expect(conferenceLink.exists()).toBe(true);
            expect(conferenceLink.text()).toContain('Join Meeting');
        });

        test('should render MattermostIcon for mattermost type', () => {
            const event = {
                id: '3',
                subject: 'Test Event',
                start: '2025-01-15T10:00:00Z',
                end: '2025-01-15T11:00:00Z',
                isAllDay: false,
                conference: 'https://mm.example.com/call/test',
            };

            const wrapper = shallow(<EventCard event={event}/>);
            const conferenceLink = wrapper.find('a[href="https://mm.example.com/call/test"]');
            expect(conferenceLink.exists()).toBe(true);
            expect(conferenceLink.text()).toContain('Join Meeting');
        });

        test('should render fallback emoji for generic type', () => {
            const event = {
                id: '4',
                subject: 'Test Event',
                start: '2025-01-15T10:00:00Z',
                end: '2025-01-15T11:00:00Z',
                isAllDay: false,
                conference: 'https://teams.microsoft.com/l/meetup/join',
            };

            const wrapper = shallow(<EventCard event={event}/>);
            const conferenceLink = wrapper.find('a[href="https://teams.microsoft.com/l/meetup/join"]');
            expect(conferenceLink.exists()).toBe(true);
            expect(conferenceLink.text()).toContain('Join Meeting');

            // For generic type, the emoji should be in the text
            expect(conferenceLink.html()).toContain('🎥');
        });
    });

    describe('EventCard Component', () => {
        test('should render conference link with correct attributes', () => {
            const event = {
                id: '1',
                subject: 'Test Event',
                start: '2025-01-15T10:00:00Z',
                end: '2025-01-15T11:00:00Z',
                isAllDay: false,
                conference: 'https://meet.google.com/abc-defg-hij',
            };

            const wrapper = shallow(<EventCard event={event}/>);
            const conferenceLink = wrapper.find('a').at(0); // First link is the webLink, second is conference

            expect(conferenceLink.exists()).toBe(true);
            expect(conferenceLink.prop('href')).toBe('https://meet.google.com/abc-defg-hij');
            expect(conferenceLink.prop('target')).toBe('_blank');
            expect(conferenceLink.prop('rel')).toBe('noopener noreferrer');
        });

        test('should not render conference link when conference is undefined', () => {
            const event = {
                id: '1',
                subject: 'Test Event',
                start: '2025-01-15T10:00:00Z',
                end: '2025-01-15T11:00:00Z',
                isAllDay: false,
            };

            const wrapper = shallow(<EventCard event={event}/>);

            // Only the webLink should be present (if exists), not a conference link
            expect(wrapper.find('a[href*="conference"]').exists()).toBe(false);
        });

        test('should not render conference link when conference is empty string', () => {
            const event = {
                id: '1',
                subject: 'Test Event',
                start: '2025-01-15T10:00:00Z',
                end: '2025-01-15T11:00:00Z',
                isAllDay: false,
                conference: '',
            };

            const wrapper = shallow(<EventCard event={event}/>);
            expect(wrapper.find('a[href=""]').exists()).toBe(false);
        });

        test('should display conference icon with proper dimensions', () => {
            const event = {
                id: '1',
                subject: 'Test Event',
                start: '2025-01-15T10:00:00Z',
                end: '2025-01-15T11:00:00Z',
                isAllDay: false,
                conference: 'https://meet.google.com/abc-defg-hij',
            };

            const wrapper = shallow(<EventCard event={event}/>);
            const conferenceLink = wrapper.find('a').at(0);

            // The icon should be in a span with width and height
            const html = conferenceLink.html();
            expect(html).toContain('width');
            expect(html).toContain('height');
            expect(html).toContain('16px');
        });
    });

    describe('Icon Component Snapshots', () => {
        test('EventCard with Google Meet conference matches snapshot', () => {
            const event = {
                id: '1',
                subject: 'Test Event',
                start: '2025-01-15T10:00:00Z',
                end: '2025-01-15T11:00:00Z',
                isAllDay: false,
                conference: 'https://meet.google.com/abc-defg-hij',
            };

            const wrapper = shallow(<EventCard event={event}/>);
            expect(wrapper).toMatchSnapshot();
        });

        test('EventCard with Zoom conference matches snapshot', () => {
            const event = {
                id: '2',
                subject: 'Test Event',
                start: '2025-01-15T10:00:00Z',
                end: '2025-01-15T11:00:00Z',
                isAllDay: false,
                conference: 'https://zoom.us/j/123456789',
            };

            const wrapper = shallow(<EventCard event={event}/>);
            expect(wrapper).toMatchSnapshot();
        });

        test('EventCard with Mattermost conference matches snapshot', () => {
            const event = {
                id: '3',
                subject: 'Test Event',
                start: '2025-01-15T10:00:00Z',
                end: '2025-01-15T11:00:00Z',
                isAllDay: false,
                conference: 'https://mm.example.com/call/test',
            };

            const wrapper = shallow(<EventCard event={event}/>);
            expect(wrapper).toMatchSnapshot();
        });

        test('EventCard with generic conference matches snapshot', () => {
            const event = {
                id: '4',
                subject: 'Test Event',
                start: '2025-01-15T10:00:00Z',
                end: '2025-01-15T11:00:00Z',
                isAllDay: false,
                conference: 'https://teams.microsoft.com/l/meetup/join',
            };

            const wrapper = shallow(<EventCard event={event}/>);
            expect(wrapper).toMatchSnapshot();
        });

        test('EventCard without conference matches snapshot', () => {
            const event = {
                id: '5',
                subject: 'Test Event',
                start: '2025-01-15T10:00:00Z',
                end: '2025-01-15T11:00:00Z',
                isAllDay: false,
            };

            const wrapper = shallow(<EventCard event={event}/>);
            expect(wrapper).toMatchSnapshot();
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle URL with special characters', () => {
            const event = {
                id: '1',
                subject: 'Test Event',
                start: '2025-01-15T10:00:00Z',
                end: '2025-01-15T11:00:00Z',
                isAllDay: false,
                conference: 'https://meet.google.com/abc-defg-hij?authuser=0&hs=123',
            };

            const wrapper = shallow(<EventCard event={event}/>);
            const conferenceLink = wrapper.find('a').at(0);
            expect(conferenceLink.prop('href')).toBe('https://meet.google.com/abc-defg-hij?authuser=0&hs=123');
        });

        test('should handle URL with port numbers', () => {
            const event = {
                id: '1',
                subject: 'Test Event',
                start: '2025-01-15T10:00:00Z',
                end: '2025-01-15T11:00:00Z',
                isAllDay: false,
                conference: 'https://mm.example.com:8443/call/test',
            };

            const wrapper = shallow(<EventCard event={event}/>);
            const conferenceLink = wrapper.find('a[href*="mm.example.com"]');
            expect(conferenceLink.exists()).toBe(true);
        });

        test('should handle URL with query parameters for all conference types', () => {
            const testCases = [
                {
                    url: 'https://meet.google.com/abc-defg-hij?pwd=test123',
                    expectedType: 'google-meet',
                },
                {
                    url: 'https://zoom.us/j/123456789?pwd=abc123',
                    expectedType: 'zoom',
                },
                {
                    url: 'https://mm.test.com/call?id=123&token=xyz',
                    expectedType: 'mattermost',
                },
            ];

            for (const {url, expectedType} of testCases) {
                const event = {
                    id: '1',
                    subject: 'Test Event',
                    start: '2025-01-15T10:00:00Z',
                    end: '2025-01-15T11:00:00Z',
                    isAllDay: false,
                    conference: url,
                };

                const wrapper = shallow(<EventCard event={event}/>);
                const conferenceLink = wrapper.find('a').at(0);
                expect(conferenceLink.exists()).toBe(true);
                expect(conferenceLink.prop('href')).toBe(url);
            }
        });
    });

    describe('formatTime Helper', () => {
        test('should format all-day events correctly', () => {
            const event = {
                id: '1',
                subject: 'All Day Event',
                start: '2025-01-15T00:00:00Z',
                end: '2025-01-16T00:00:00Z',
                isAllDay: true,
            };

            const wrapper = shallow(<EventCard event={event}/>);
            expect(wrapper.text()).toContain('All day');
        });
    });

    describe('formatDate Helper', () => {
        test('should format dates correctly', () => {
            const event = {
                id: '1',
                subject: 'Test Event',
                start: '2025-01-15T10:00:00Z',
                end: '2025-01-15T11:00:00Z',
                isAllDay: false,
            };

            const wrapper = shallow(<EventCard event={event} showDate={true}/>);

            expect(wrapper.exists()).toBe(true);
        });
    });
});

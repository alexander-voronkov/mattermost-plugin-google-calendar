// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';

import {Modal} from 'react-bootstrap';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import ChannelSelector from '../channel_selector';

import {CreateEventPayload} from '@/types/calendar_api_types';

import {getModalStyles} from '@/utils/styles';

import FormButton from '@/components/form_button';
import Loading from '@/components/loading';
import Setting from '@/components/setting';
import AttendeeSelector from '@/components/attendee_selector';
import {capitalizeFirstCharacter} from '@/utils/text';
import {CreateCalendarEventResponse, createCalendarEvent} from '@/actions';
import {getTodayString} from '@/utils/datetime';

import './create_event_form.scss';

type Props = {
    close: (e?: Event) => void;
};

export default function CreateEventForm(props: Props) {
    const [storedError, setStoredError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);

    const dispatch = useDispatch();

    const [formValues, setFormValues] = useState<CreateEventPayload>({
        subject: '',
        all_day: false,
        attendees: [],
        date: getTodayString(),
        start_time: '',
        end_time: '',
        description: '',
        channel_id: '',
        location: '',
        add_mattermost_call: true, // Default to adding a call
    });

    const setFormValue = <Key extends keyof CreateEventPayload>(name: Key, value: CreateEventPayload[Key]) => {
        setFormValues((values: CreateEventPayload) => ({
            ...values,
            [name]: value,
        }));
    };

    const theme = useSelector(getTheme);

    const handleClose = (e?: Event) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }

        props.close();
    };

    const handleError = (error: string) => {
        const errorMessage = capitalizeFirstCharacter(error);
        setStoredError(errorMessage);
        setSubmitting(false);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }

        // add required field validation

        setSubmitting(true);

        const response = (await dispatch(createCalendarEvent(formValues))) as CreateCalendarEventResponse;
        if (response.error) {
            handleError(response.error);
            return;
        }

        handleClose();
    };

    const style = getModalStyles(theme);

    const disableSubmit = false;
    const footer = (
        <React.Fragment>
            <FormButton
                type='button'
                btnClass='btn-link'
                defaultMessage='Cancel'
                onClick={handleClose}
            />
            <FormButton
                id='submit-button'
                type='submit'
                btnClass='btn btn-primary'
                saving={submitting}
                disabled={disableSubmit}
            >
                {'Create'}
            </FormButton>
        </React.Fragment>
    );

    let form;
    if (loading) {
        form = <Loading/>;
    } else {
        form = (
            <ActualForm
                formValues={formValues}
                setFormValue={setFormValue}
            />
        );
    }

    let error;
    if (storedError) {
        error = (
            <p className='alert alert-danger'>
                <i
                    style={{marginRight: '10px'}}
                    className='fa fa-warning'
                    title='Warning Icon'
                />
                <span>{storedError}</span>
            </p>
        );
    }

    return (
        <form
            role='form'
            onSubmit={handleSubmit}
        >
            <Modal.Body
                style={style.modalBody}
            >
                {error}
                {form}
            </Modal.Body>
            <Modal.Footer style={style.modalFooter}>
                {footer}
            </Modal.Footer>
        </form>
    );
}

type ActualFormProps = {
    formValues: CreateEventPayload;
    setFormValue: <Key extends keyof CreateEventPayload>(name: Key, value: CreateEventPayload[Key]) => Promise<{ error?: string }>;
}

const ActualForm = (props: ActualFormProps) => {
    const {formValues, setFormValue} = props;

    // Auto-set end time when start time changes (30 min later)
    const handleStartTimeChange = (value: string) => {
        setFormValue('start_time', value);
        if (value && !formValues.end_time) {
            const [hours, minutes] = value.split(':').map(Number);
            const endMinutes = (hours * 60 + minutes + 30) % (24 * 60);
            const endHours = Math.floor(endMinutes / 60);
            const endMins = endMinutes % 60;
            setFormValue('end_time', `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`);
        }
    };

    return (
        <div className='mscalendar-create-event-form' style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            {/* Subject */}
            <Setting label='Subject' inputId='subject' required={true}>
                <input
                    id='subject'
                    onChange={(e) => setFormValue('subject', e.target.value)}
                    value={formValues.subject}
                    className='form-control'
                    placeholder='Add title'
                    autoFocus={true}
                />
            </Setting>

            {/* Date & Time Row */}
            <div style={{display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap'}}>
                <div style={{flex: '1 1 130px', minWidth: '130px'}}>
                    <label className='control-label' style={{display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontSize: '13px'}}>
                        Date <span className='error-text'>*</span>
                    </label>
                    <input
                        onChange={(e) => setFormValue('date', e.target.value)}
                        min={getTodayString()}
                        value={formValues.date}
                        className='form-control'
                        type='date'
                        style={{height: '36px', colorScheme: 'dark'}}
                    />
                </div>
                <div style={{flex: '0 0 95px'}}>
                    <label className='control-label' style={{display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontSize: '13px'}}>
                        Start <span className='error-text'>*</span>
                    </label>
                    <input
                        type='time'
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                        value={formValues.start_time}
                        className='form-control'
                        style={{height: '36px', colorScheme: 'dark'}}
                    />
                </div>
                <span style={{paddingBottom: '8px', color: 'var(--center-channel-color-56)'}}>–</span>
                <div style={{flex: '0 0 95px'}}>
                    <label className='control-label' style={{display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontSize: '13px'}}>
                        End <span className='error-text'>*</span>
                    </label>
                    <input
                        type='time'
                        onChange={(e) => setFormValue('end_time', e.target.value)}
                        value={formValues.end_time}
                        className='form-control'
                        style={{height: '36px', colorScheme: 'dark'}}
                        min={formValues.start_time || undefined}
                    />
                </div>
            </div>

            {/* Guests */}
            <Setting label='Guests' inputId='guests'>
                <AttendeeSelector
                    onChange={(selected) => setFormValue('attendees', selected)}
                />
            </Setting>

            {/* Description */}
            <Setting label='Description' inputId='description'>
                <textarea
                    id='description'
                    onChange={(e) => setFormValue('description', e.target.value)}
                    value={formValues.description}
                    className='form-control'
                    placeholder='Add description'
                    rows={3}
                    style={{resize: 'vertical', minHeight: '60px'}}
                />
            </Setting>

            {/* Channel Link */}
            <Setting label='Link to channel' inputId='channel'>
                <ChannelSelector
                    onChange={(selected) => setFormValue('channel_id', selected)}
                />
            </Setting>

            {/* Mattermost Call checkbox */}
            <div style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '8px 10px',
                backgroundColor: 'var(--center-channel-color-04)',
                borderRadius: '4px',
                border: '1px solid var(--center-channel-color-08)',
            }}>
                <input
                    type="checkbox"
                    id="add_mattermost_call"
                    checked={formValues.add_mattermost_call || false}
                    onChange={(e) => setFormValue('add_mattermost_call', e.target.checked)}
                    style={{width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0}}
                />
                <label 
                    htmlFor="add_mattermost_call" 
                    style={{cursor: 'pointer', fontSize: '14px', margin: 0}}
                >
                    📞 Add Mattermost Call link
                </label>
            </div>
        </div>
    );
};

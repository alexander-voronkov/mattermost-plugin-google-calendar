import React, {useCallback, useState} from 'react';
import {useSelector} from 'react-redux';

import AsyncCreatableSelect from 'react-select/async-creatable';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {Client4} from 'mattermost-redux/client';

import {getStyleForReactSelect} from '@/utils/styles';

type SelectOption = {
    label: string;
    value: string;
    username?: string;
    email?: string;
    avatarUrl?: string;
}

type Props = {
    onChange: (selected: string[]) => void;
    value?: string[];
};

export default function AttendeeSelector(props: Props) {
    const [selectedOptions, setSelectedOptions] = useState<SelectOption[]>([]);
    const theme = useSelector(getTheme);

    const loadOptions = useCallback(async (input: string): Promise<SelectOption[]> => {
        if (!input || input.length < 2) {
            return [];
        }

        try {
            // Search all Mattermost users
            const users = await Client4.searchUsers(input, {});

            return users.
                filter((user) => !user.is_bot). // Exclude bots
                filter((user) => user.email). // Must have email
                map((user) => ({
                    label: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
                    value: user.email!,
                    username: user.username,
                    email: user.email,
                    avatarUrl: Client4.getProfilePictureUrl(user.id, user.last_picture_update || 0),
                }));
        } catch {
            return [];
        }
    }, []);

    const isValidEmail = (input: string): boolean => {
        return (/\S+@\S+\.\S+/).test(input);
    };

    const handleChange = (selected: readonly SelectOption[] | null) => {
        const options = selected ? [...selected] : [];
        setSelectedOptions(options);
        props.onChange(options.map((option) => option.value));
    };

    const formatOptionLabel = (option: SelectOption, context: { context: 'menu' | 'value' }) => {
        // Compact view for selected values
        if (context.context === 'value') {
            return (
                <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                    {option.avatarUrl && (
                        <img
                            src={option.avatarUrl}
                            alt=''
                            style={{width: '18px', height: '18px', borderRadius: '50%'}}
                        />
                    )}
                    <span>{option.label}</span>
                </div>
            );
        }

        // Full view for dropdown menu
        if (option.username) {
            return (
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0'}}>
                    {option.avatarUrl && (
                        <img
                            src={option.avatarUrl}
                            alt=''
                            style={{width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0}}
                        />
                    )}
                    <div style={{display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0}}>
                        <span style={{fontWeight: 500}}>{option.label}</span>
                        <span style={{fontSize: '12px', opacity: 0.7}}>{`@${option.username} • ${option.email}`}</span>
                    </div>
                </div>
            );
        }

        // For manually entered emails
        return <span>{option.label}</span>;
    };

    return (
        <AsyncCreatableSelect
            value={selectedOptions}
            loadOptions={loadOptions}
            defaultOptions={false}
            menuPortalTarget={document.body}
            menuPlacement='auto'
            onChange={handleChange}
            isValidNewOption={isValidEmail}
            styles={getStyleForReactSelect(theme)}
            isMulti={true}
            placeholder='Type to search users...'
            noOptionsMessage={({inputValue}) =>
                (inputValue.length < 2 ? 'Type at least 2 characters' : 'No users found')
            }
            formatOptionLabel={formatOptionLabel}
            formatCreateLabel={(input) => `Invite "${input}"`}
        />
    );
}

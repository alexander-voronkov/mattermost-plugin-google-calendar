import React, {useCallback, useState} from 'react';
import {useSelector} from 'react-redux';

import AsyncCreatableSelect from 'react-select/async-creatable';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {Client4} from 'mattermost-redux/client';

import {getStyleForReactSelect} from '@/utils/styles';

type SelectOption = {
    label: string;
    value: string;
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
            
            return users.map((user) => ({
                label: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
                value: user.email || `${user.username}@mattermost.local`,
                // Store additional info for display
                username: user.username,
                email: user.email,
            })).filter((opt) => opt.value); // Only users with email
        } catch (error) {
            console.error('Failed to search users:', error);
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

    const formatOptionLabel = (option: SelectOption & { username?: string; email?: string }) => {
        if (option.username) {
            return (
                <div style={{display: 'flex', flexDirection: 'column', lineHeight: 1.3}}>
                    <span style={{fontWeight: 500}}>{option.label}</span>
                    <span style={{fontSize: '12px', opacity: 0.7}}>@{option.username} • {option.email}</span>
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
            placeholder="Type to search users..."
            noOptionsMessage={({inputValue}) => 
                inputValue.length < 2 ? 'Type at least 2 characters' : 'No users found'
            }
            formatOptionLabel={formatOptionLabel}
            formatCreateLabel={(input) => `Invite "${input}"`}
        />
    );
}

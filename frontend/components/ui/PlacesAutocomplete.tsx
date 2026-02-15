'use client'

import React, { useState } from 'react'
import RPAutocomplete, { geocodeByAddress } from 'react-places-autocomplete'
import { useLoadScript } from '@react-google-maps/api'

interface Props {
    onPlaceSelect: (place: { label: string; value: any }) => void
    defaultValue?: string
}

const libraries: ("places")[] = ["places"]

export function PlacesAutocomplete({ onPlaceSelect, defaultValue }: Props) {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    })

    const [value, setValue] = useState<string>(defaultValue || '')

    if (!isLoaded) return <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />

    return (
        <div className="w-full">
            <RPAutocomplete
                value={value}
                onChange={(address) => setValue(address)}
                onSelect={async (address) => {
                    setValue(address)
                    try {
                        const results = await geocodeByAddress(address)
                        const placeId = results && results[0] ? results[0].place_id : undefined
                        onPlaceSelect({ label: address, value: { place_id: placeId } })
                    } catch (e) {
                        onPlaceSelect({ label: address, value: { place_id: undefined } })
                    }
                }}
            >
                {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
                    <div className="relative">
                        <input
                            {...getInputProps({
                                placeholder: 'Search for venue...',
                                className: "block w-full rounded-lg bg-white border border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-900 text-sm py-2 px-3 transition-all"
                            })}
                        />
                        {(loading || suggestions.length > 0) && (
                            <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                                {loading && (
                                    <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
                                )}
                                {suggestions.map(s => {
                                    const props = getSuggestionItemProps(s, {
                                        className: "cursor-pointer px-3 py-2 text-sm hover:bg-blue-50"
                                    })
                                    const { key: reactKey, ...restProps } = props as Record<string, any>
                                    return (
                                        <div key={reactKey ?? s.placeId ?? s.description} {...restProps}>
                                            <div className="text-gray-900">{s.description}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </RPAutocomplete>
        </div>
    )
}

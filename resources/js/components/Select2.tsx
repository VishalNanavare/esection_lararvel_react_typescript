import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

export interface Select2Option {
    value: string;
    label: string;
    name?: string;
    fees?: string;
}

export interface Select2Props {
    id?: string;
    name?: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<Select2Option | string>;
    placeholder?: string;
    allowClear?: boolean;
    className?: string;
    disabled?: boolean;
    ariaLabel?: string;
}

export const Select2: React.FC<Select2Props> = ({
    id,
    name,
    value,
    onChange,
    options,
    placeholder = '-- Select --',
    allowClear = true,
    className = '',
    disabled = false,
    ariaLabel,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Normalize options into { value, label, name, fees }
    const normalizedOptions = useMemo<Select2Option[]>(() => {
        return options.map((opt) => {
            if (typeof opt === 'string') {
                return { value: opt, label: opt };
            }
            return opt;
        });
    }, [options]);

    // Current selected option label
    const selectedOption = useMemo(() => {
        return normalizedOptions.find((opt) => String(opt.value) === String(value));
    }, [normalizedOptions, value]);

    // Filter options based on search term
    const filteredOptions = useMemo(() => {
        if (!searchTerm.trim()) {
            return normalizedOptions;
        }
        const term = searchTerm.toLowerCase();
        return normalizedOptions.filter(
            (opt) =>
                opt.label.toLowerCase().includes(term) ||
                opt.value.toLowerCase().includes(term) ||
                (opt.name && opt.name.toLowerCase().includes(term))
        );
    }, [normalizedOptions, searchTerm]);

    // Reset highlighted index when filtered options change
    useEffect(() => {
        setHighlightedIndex(0);
    }, [filteredOptions]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            if (value) {
                const idx = filteredOptions.findIndex((opt) => String(opt.value) === String(value));
                if (idx >= 0) {
                    setHighlightedIndex(idx);
                }
            }
            requestAnimationFrame(() => {
                searchInputRef.current?.focus();
            });
        }
    }, [isOpen]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (isOpen && listRef.current) {
            const highlightedItem = listRef.current.children[highlightedIndex] as HTMLElement;
            if (highlightedItem) {
                const list = listRef.current;
                const itemTop = highlightedItem.offsetTop;
                const itemBottom = itemTop + highlightedItem.offsetHeight;
                const listTop = list.scrollTop;
                const listBottom = listTop + list.clientHeight;

                if (itemTop < listTop) {
                    list.scrollTop = itemTop;
                } else if (itemBottom > listBottom) {
                    list.scrollTop = itemBottom - list.clientHeight;
                }
            }
        }
    }, [highlightedIndex, isOpen]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = useCallback(
        (val: string) => {
            onChange(val);
            setIsOpen(false);
        },
        [onChange]
    );

    const handleClear = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onChange('');
            setIsOpen(false);
        },
        [onChange]
    );

    const handleToggle = () => {
        if (disabled) return;
        setIsOpen((prev) => !prev);
    };

    const handleContainerKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
            }
        } else {
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsOpen(false);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                );
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredOptions[highlightedIndex]) {
                    handleSelect(filteredOptions[highlightedIndex].value);
                }
            } else if (e.key === 'Tab') {
                setIsOpen(false);
            }
        }
    };

    const displayLabel = selectedOption
        ? selectedOption.label
        : value
        ? value
        : '';

    return (
        <div
            ref={containerRef}
            id={id ? `${id}-select2-container` : undefined}
            className={`select2 select2-container select2-container--default ${
                isOpen ? 'select2-container--open select2-container--below' : ''
            } ${disabled ? 'select2-container--disabled' : ''} ${className}`}
            style={{ width: '100%', position: 'relative' }}
            onKeyDown={handleContainerKeyDown}
        >
            <span className="selection">
                <span
                    className={`select2-selection select2-selection--single ${
                        disabled ? 'disabled' : ''
                    }`}
                    role="combobox"
                    tabIndex={disabled ? -1 : 0}
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    aria-label={ariaLabel || placeholder}
                    onClick={handleToggle}
                    style={{
                        outline: 'none',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        display: 'block',
                        position: 'relative',
                    }}
                >
                    <span
                        className="select2-selection__rendered"
                        title={displayLabel}
                        style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                            paddingRight: allowClear && Boolean(value) && !disabled ? '2.75rem' : '1.75rem',
                        }}
                    >
                        {displayLabel && displayLabel !== placeholder ? (
                            displayLabel
                        ) : (
                            <span className="select2-selection__placeholder">{placeholder}</span>
                        )}
                    </span>

                    {allowClear && Boolean(value) && !disabled && (
                        <span
                            className="select2-selection__clear"
                            role="button"
                            tabIndex={0}
                            title="Clear selection"
                            onClick={handleClear}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    handleClear(e as any);
                                }
                            }}
                            style={{
                                position: 'absolute',
                                right: '1.85rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                cursor: 'pointer',
                                zIndex: 2,
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                lineHeight: '1',
                                color: '#94a3b8',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '1.25rem',
                                height: '1.25rem',
                                float: 'none',
                            }}
                        >
                            ×
                        </span>
                    )}

                    <span className="select2-selection__arrow" role="presentation">
                        <b role="presentation" />
                    </span>
                </span>
            </span>

            {isOpen && (
                <span
                    className="select2-dropdown select2-dropdown--below"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        width: '100%',
                        zIndex: 1060,
                        backgroundColor: '#ffffff',
                    }}
                >
                    <span className="select2-search select2-search--dropdown">
                        <input
                            ref={searchInputRef}
                            className="select2-search__field"
                            type="search"
                            tabIndex={0}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            role="searchbox"
                            placeholder="Type to search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </span>

                    <span className="select2-results">
                        <ul
                            ref={listRef}
                            className="select2-results__options"
                            role="listbox"
                            style={{ maxHeight: '220px', overflowY: 'auto' }}
                        >
                            {filteredOptions.length === 0 ? (
                                <li
                                    className="select2-results__option select2-results__message"
                                    role="alert"
                                >
                                    No results found
                                </li>
                            ) : (
                                filteredOptions.map((opt, idx) => {
                                    const isSelected = String(opt.value) === String(value);
                                    const isHighlighted = idx === highlightedIndex;
                                    return (
                                        <li
                                            key={`${opt.value}-${idx}`}
                                            className={`select2-results__option ${
                                                isHighlighted
                                                    ? 'select2-results__option--highlighted'
                                                    : ''
                                            } ${isSelected ? 'select2-results__option--selected' : ''}`}
                                            role="option"
                                            aria-selected={isSelected}
                                            onMouseEnter={() => setHighlightedIndex(idx)}
                                            onClick={() => handleSelect(opt.value)}
                                            style={{
                                                cursor: 'pointer',
                                                whiteSpace: 'normal',
                                                wordBreak: 'break-word',
                                            }}
                                        >
                                            {opt.name && opt.fees !== undefined ? (
                                                <div className="d-flex align-items-center justify-content-between gap-2 w-100">
                                                    <span className="fw-semibold">{opt.name}</span>
                                                    {opt.fees ? (
                                                        <span
                                                            className={`badge ${
                                                                isHighlighted ? 'bg-white text-dark' : 'badge-glass-indigo'
                                                            } text-nowrap`}
                                                        >
                                                            <i className="fa fa-inr me-1"></i>Fees: ₹{opt.fees}
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className={`badge ${
                                                                isHighlighted
                                                                    ? 'bg-white bg-opacity-25 text-white'
                                                                    : 'bg-light text-muted border'
                                                            } text-nowrap`}
                                                        >
                                                            Fees: —
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                opt.label
                                            )}
                                        </li>
                                    );
                                })
                            )}
                        </ul>
                    </span>
                </span>
            )}

            {/* Hidden native input for form compatibility */}
            {name && <input type="hidden" name={name} value={value} />}
        </div>
    );
};

export default Select2;

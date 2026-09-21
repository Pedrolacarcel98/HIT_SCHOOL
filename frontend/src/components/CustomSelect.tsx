import React, { useEffect, useRef, useState, useId } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface CustomSelectOption<T extends string | number = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface CustomSelectProps<T extends string | number = string> {
  value: T;
  options: (CustomSelectOption<T> | string | number)[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  triggerStyle?: React.CSSProperties;
  menuStyle?: React.CSSProperties;
  variant?: 'default' | 'subtle' | 'outline' | 'pill';
  size?: 'sm' | 'md' | 'lg';
  searchable?: boolean;
  searchPlaceholder?: string;
  align?: 'left' | 'right';
  renderOption?: (option: CustomSelectOption<T>, isSelected: boolean) => React.ReactNode;
}

export function CustomSelect<T extends string | number = string>({
  value,
  options: rawOptions,
  onChange,
  placeholder = 'Seleccionar...',
  disabled = false,
  required = false,
  name,
  id,
  ariaLabel,
  className = '',
  style,
  triggerStyle,
  menuStyle,
  variant = 'default',
  size = 'md',
  searchable,
  searchPlaceholder = 'Buscar...',
  align = 'left',
  renderOption
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  // Normalize options to CustomSelectOption<T>[]
  const options: CustomSelectOption<T>[] = rawOptions.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt as T, label: String(opt) };
    }
    return opt;
  });

  const selected = options.find((opt) => opt.value === value);

  // Auto-enable search if more than 8 options and not explicitly disabled
  const showSearch = searchable !== undefined ? searchable : options.length > 8;

  // Filtered options based on search term
  const filteredOptions = showSearch && searchTerm.trim() !== ''
    ? options.filter((opt) => {
        const text = typeof opt.label === 'string' 
          ? opt.label 
          : typeof opt.value === 'string' 
            ? opt.value 
            : String(opt.value);
        return text.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (opt.description && opt.description.toLowerCase().includes(searchTerm.toLowerCase()));
      })
    : options;

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      return;
    }

    if (showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, showSearch]);

  const handleSelect = (option: CustomSelectOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      if (!isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    }
  };

  return (
    <div
      className={`custom-select-container custom-select-variant-${variant} custom-select-size-${size} ${disabled ? 'is-disabled' : ''} ${className}`}
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: style?.width || (triggerStyle?.width === '100%' ? '100%' : 'auto'),
        ...style
      }}
    >
      {/* Hidden input for form submission & required validation if needed */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={value !== undefined && value !== null ? String(value) : ''}
          required={required}
        />
      )}

      <button
        id={selectId}
        type="button"
        className={`custom-select__trigger ${isOpen ? 'is-active' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || (typeof selected?.label === 'string' ? selected.label : placeholder)}
        style={triggerStyle}
      >
        <span className="custom-select__label-content">
          {selected?.icon && <span className="custom-select__icon">{selected.icon}</span>}
          <span className={`custom-select__text ${!selected ? 'is-placeholder' : ''}`}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={size === 'sm' ? 14 : 16}
          className={`custom-select__chevron ${isOpen ? 'is-open' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className={`custom-select__menu animate-scale-in ${align === 'right' ? 'align-right' : 'align-left'}`}
          role="listbox"
          aria-labelledby={selectId}
          style={menuStyle}
        >
          {showSearch && (
            <div className="custom-select__search-wrapper" onClick={(e) => e.stopPropagation()}>
              <Search size={14} className="custom-select__search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="custom-select__search-input"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="custom-select__search-clear"
                  onClick={() => setSearchTerm('')}
                  aria-label="Limpiar búsqueda"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          <div className="custom-select__options-list">
            {filteredOptions.length === 0 ? (
              <div className="custom-select__empty-message">
                No se encontraron opciones
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    className={`custom-select__option ${isSelected ? 'is-selected' : ''} ${option.disabled ? 'is-disabled' : ''}`}
                    onClick={() => handleSelect(option)}
                  >
                    {renderOption ? (
                      renderOption(option, isSelected)
                    ) : (
                      <>
                        <div className="custom-select__option-content">
                          {option.icon && <span className="custom-select__option-icon">{option.icon}</span>}
                          <div className="custom-select__option-text-wrapper">
                            <span className="custom-select__option-label">{option.label}</span>
                            {option.description && (
                              <span className="custom-select__option-desc">{option.description}</span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <Check size={15} className="custom-select__check-icon" />
                        )}
                      </>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomSelect;

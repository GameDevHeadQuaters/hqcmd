import { useState, useRef, useEffect } from 'react'
import { PRESET_SKILLS } from '../utils/skillsList'
import { IconX } from '@tabler/icons-react'

export default function TagInput({
  tags = [],
  onChange,
  suggestions = PRESET_SKILLS,
  placeholder = 'Add a skill...',
  maxTags = null,
  allowCustom = true,
}) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIdx, setHighlightedIdx] = useState(0)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  const filtered = inputValue.length > 0
    ? suggestions.filter(s =>
        s.toLowerCase().includes(inputValue.toLowerCase()) &&
        !tags.includes(s)
      ).slice(0, 8)
    : []

  function addTag(tag) {
    const trimmed = tag.trim()
    if (!trimmed) return
    if (tags.includes(trimmed)) return
    if (maxTags && tags.length >= maxTags) return
    if (!allowCustom && !suggestions.includes(trimmed)) return
    onChange([...tags, trimmed])
    setInputValue('')
    setShowSuggestions(false)
    setHighlightedIdx(0)
    inputRef.current?.focus()
  }

  function removeTag(tag) {
    onChange(tags.filter(t => t !== tag))
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (filtered.length > 0 && showSuggestions) {
        addTag(filtered[highlightedIdx] || inputValue)
      } else if (allowCustom && inputValue.trim()) {
        addTag(inputValue)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  useEffect(() => {
    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Tag chips + input */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center',
          padding: '8px 10px', borderRadius: '8px',
          border: `1px solid ${showSuggestions ? 'var(--brand-accent)' : 'var(--border-default)'}`,
          background: 'var(--bg-elevated)',
          cursor: 'text', minHeight: '42px',
          boxShadow: showSuggestions ? '0 0 0 3px var(--brand-accent-glow)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        {tags.map(tag => (
          <span key={tag} style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '99px', fontSize: '12px',
            background: 'var(--brand-accent-glow)',
            color: 'var(--brand-accent)',
            border: '1px solid var(--brand-accent)',
          }}>
            {tag}
            <button
              onClick={e => { e.stopPropagation(); removeTag(tag) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: 'var(--brand-accent)', display: 'flex', alignItems: 'center' }}
            >
              <IconX size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value)
            setShowSuggestions(true)
            setHighlightedIdx(0)
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          style={{
            border: 'none', outline: 'none', background: 'transparent',
            color: 'var(--text-primary)', fontSize: '13px',
            flex: 1, minWidth: '120px', padding: '2px 0',
          }}
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: '8px', marginTop: '4px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}>
          {filtered.map((s, i) => (
            <div
              key={s}
              onMouseDown={e => { e.preventDefault(); addTag(s) }}
              onMouseEnter={() => setHighlightedIdx(i)}
              style={{
                padding: '8px 12px', fontSize: '13px', cursor: 'pointer',
                background: i === highlightedIdx ? 'var(--brand-accent-glow)' : 'transparent',
                color: i === highlightedIdx ? 'var(--brand-accent)' : 'var(--text-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span>{s}</span>
              {i === highlightedIdx && (
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>↵ to add</span>
              )}
            </div>
          ))}
          {allowCustom && inputValue && !suggestions.includes(inputValue) && (
            <div
              onMouseDown={e => { e.preventDefault(); addTag(inputValue) }}
              style={{
                padding: '8px 12px', fontSize: '12px', cursor: 'pointer',
                borderTop: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <span style={{ color: 'var(--brand-pink)' }}>+</span>
              Add "{inputValue}" as custom skill
            </div>
          )}
        </div>
      )}

      {/* Helper text */}
      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
        Type to search, press Enter or comma to add. Backspace to remove last tag.
      </p>
    </div>
  )
}

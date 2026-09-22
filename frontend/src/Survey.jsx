import { useEffect, useState } from 'react'

const SURVEY_FIELDS = [
  {
    name: 'name',
    label: 'Your name',
    type: 'dropdown',
    source: 'roster',
    optional: false,
  },
  {
    name: 'school_year',
    label: 'What year are you?',
    type: 'dropdown',
    values: ['First-year', 'Sophomore', 'Junior', 'Senior', 'Other'],
    optional: false,
  },
  {
    name: 'working_style',
    label: 'Describe your working style in 1–2 sentences',
    type: 'free_text',
    optional: false,
  },
]

function emptyAnswers() {
  return Object.fromEntries(
    SURVEY_FIELDS.map((field) => [field.name, field.type === 'multi_select' ? [] : '']),
  )
}

function isFilled(field, value) {
  if (field.type === 'multi_select') return Array.isArray(value) && value.length > 0
  return String(value ?? '').trim() !== ''
}

export default function Survey({ navigate }) {
  const [roster, setRoster] = useState(null)
  const [answers, setAnswers] = useState(emptyAnswers)
  const [missing, setMissing] = useState([])
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/roster')
      .then((res) => {
        if (!res.ok) throw new Error(`Backend responded ${res.status}`)
        return res.json()
      })
      .then(setRoster)
      .catch((err) => setError(err.message))
  }, [])

  function setField(name, value) {
    setAnswers((prev) => ({ ...prev, [name]: value }))
  }

  function toggleMulti(name, option) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[name]) ? prev[name] : []
      const next = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option]
      return { ...prev, [name]: next }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const absent = SURVEY_FIELDS.filter((field) => !field.optional && !isFilled(field, answers[field.name]))
    if (absent.length) {
      setMissing(absent.map((field) => field.label))
      setError(null)
      return
    }

    setMissing([])
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Backend responded ${res.status}`)
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!roster && !error) {
    return (
      <main className="page">
        <h1>Survey</h1>
        <p>Loading roster…</p>
      </main>
    )
  }

  if (error && !roster) {
    return (
      <main className="page">
        <h1>Survey</h1>
        <p className="error">
          Could not reach the backend: {error}. Is <code>python app.py</code> running?
        </p>
      </main>
    )
  }

  return (
    <main className="page">
      <h1>Survey</h1>
      <p className="subtitle">Tell us about yourself so we can form better groups.</p>
      <nav className="nav">
        <button type="button" className="linkish" onClick={() => navigate('/')}>
          ← Back to groups
        </button>
      </nav>

      {submitted ? (
        <p className="confirmation">Thanks — your responses were saved.</p>
      ) : (
        <form className="survey" onSubmit={handleSubmit} noValidate>
          {missing.length > 0 && (
            <p className="error">Please fill in: {missing.join(', ')}</p>
          )}
          {error && <p className="error">{error}</p>}

          {SURVEY_FIELDS.map((field) => {
            const options = field.source === 'roster' ? roster.students.map((s) => s.name) : field.values || []
            return (
              <div className="field" key={field.name}>
                <label htmlFor={field.name}>
                  {field.label}
                  {field.optional ? ' (optional)' : ''}
                </label>
                {field.type === 'dropdown' && (
                  <select
                    id={field.name}
                    value={answers[field.name]}
                    onChange={(e) => setField(field.name, e.target.value)}
                  >
                    <option value="">Select…</option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
                {field.type === 'scale' && (
                  <div className="scale" role="radiogroup" aria-labelledby={field.name}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className="scale-option">
                        <input
                          type="radio"
                          name={field.name}
                          value={n}
                          checked={String(answers[field.name]) === String(n)}
                          onChange={() => setField(field.name, String(n))}
                        />
                        {n}
                      </label>
                    ))}
                  </div>
                )}
                {field.type === 'multi_select' && (
                  <div className="multi">
                    {options.map((option) => (
                      <label key={option} className="multi-option">
                        <input
                          type="checkbox"
                          checked={(answers[field.name] || []).includes(option)}
                          onChange={() => toggleMulti(field.name, option)}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
                {field.type === 'free_text' && (
                  <textarea
                    id={field.name}
                    rows={3}
                    value={answers[field.name]}
                    onChange={(e) => setField(field.name, e.target.value)}
                  />
                )}
              </div>
            )
          })}

          <button className="randomize" type="submit" disabled={saving}>
            {saving ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      )}
    </main>
  )
}

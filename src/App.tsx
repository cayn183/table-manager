import React, { useState } from 'react'
import Importer, { Group } from './components/Importer'
import { bestFitAssign } from './utils/placement'

type Table = { id: string; capacity: number }

const defaultTables: Table[] = [
  { id: 'T1', capacity: 8 },
  { id: 'T2', capacity: 8 },
  { id: 'T3', capacity: 6 },
  { id: 'T4', capacity: 6 },
  { id: 'T5', capacity: 10 }
]

export default function App() {
  const [groups, setGroups] = useState<Group[]>([])
  const [tables, setTables] = useState<Table[]>(defaultTables)
  const [assignments, setAssignments] = useState<Record<string, Group[]>>({})

  function handleImport(parsed: Group[]) {
    setGroups(parsed)
    setAssignments({})
  }

  function autoAssign() {
    const result = bestFitAssign(tables, groups)
    setAssignments(result)
  }

  return (
    <div className="container">
      <h1>Table Manager</h1>
      <Importer onImport={handleImport} />

      <div className="controls">
        <button onClick={autoAssign} disabled={groups.length === 0}>
          Auto Assign (Best-Fit)
        </button>
      </div>

      <section>
        <h2>Imported Groups ({groups.length})</h2>
        <ol>
          {groups.map((g, i) => (
            <li key={i}>{g.name} — {g.size}</li>
          ))}
        </ol>
      </section>

      <section>
        <h2>Tables</h2>
        <div className="tables">
          {tables.map((t) => (
            <div key={t.id} className="table">
              <h3>{t.id} (cap {t.capacity})</h3>
              <div className="assigned">
                {(assignments[t.id] || []).map((g, idx) => (
                  <div key={idx} className="group-chip">{g.name} ({g.size})</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

import React from 'react'
import Papa from 'papaparse'

export type Group = { name: string; size: number; time?: string; toGo?: boolean; salutation?: 'Fam' | 'Frau' | 'Herr' | string }

export default function Importer({ onImport }: { onImport: (g: Group[]) => void }) {
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[]
        const groups = data
          .map((r) => {
            const name = r.family || r.group || r.name || Object.values(r)[0]
            const sizeRaw = r.count ?? r.size ?? Object.values(r)[1]
            const size = Number(sizeRaw) || 0
            const timeVal = r.time ?? r.zeit ?? r.slot ?? ''
            const salutationVal = r.salutation ?? r.title ?? r.anrede ?? 'Fam'
            const toGoVal = r.toGo ?? r.togo ?? r.takeaway ?? r.takeAway ?? r.to_go
            return name ? { name: String(name).trim(), size, time: timeVal ? String(timeVal).trim() : undefined, toGo: Boolean(toGoVal), salutation: String(salutationVal || 'Fam').trim() || 'Fam' } : null
          })
          .filter(Boolean) as Group[]
        onImport(groups)
      },
    })
  }

  function handlePaste(text: string) {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[]
        const groups = data
          .map((r) => {
            const name = r.family || r.group || r.name || Object.values(r)[0]
            const sizeRaw = r.count ?? r.size ?? Object.values(r)[1]
            const size = Number(sizeRaw) || 0
            const timeVal = r.time ?? r.zeit ?? r.slot ?? ''
            const salutationVal = r.salutation ?? r.title ?? r.anrede ?? 'Fam'
            const toGoVal = r.toGo ?? r.togo ?? r.takeaway ?? r.takeAway ?? r.to_go
            return name ? { name: String(name).trim(), size, time: timeVal ? String(timeVal).trim() : undefined, toGo: Boolean(toGoVal), salutation: String(salutationVal || 'Fam').trim() || 'Fam' } : null
          })
          .filter(Boolean) as Group[]
        onImport(groups)
      },
    })
  }

  return (
    <div className="importer">
      <label className="file-input">
        Import CSV (columns: family/group, count)
        <input type="file" accept=".csv" onChange={handleFile} />
      </label>
      <div className="paste">
        <textarea placeholder="Or paste CSV text here" onBlur={(e) => handlePaste(e.target.value)} />
      </div>
    </div>
  )
}

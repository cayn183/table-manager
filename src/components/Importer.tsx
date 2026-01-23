import React from 'react'
import Papa from 'papaparse'

export type Group = { id: string; name: string; size: number; time?: string; toGo?: boolean; accessible?: boolean; salutation?: 'Fam' | 'Frau' | 'Herr' | string }

export default function Importer({ onImport }: { onImport: (g: Group[]) => void }) {
  const [fileInfo, setFileInfo] = React.useState<{ name: string; encoding: string } | null>(null)
  
  function detectEncoding(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    
    // Check for UTF-16 LE BOM (FF FE)
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
      return 'utf-16le'
    }
    
    // Check for UTF-16 BE BOM (FE FF)
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      return 'utf-16be'
    }
    
    // Check for UTF-8 BOM (EF BB BF)
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      return 'utf-8'
    }
    
    // Try UTF-8 decoding and check for errors
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true })
      decoder.decode(buffer)
      // If no error, it's valid UTF-8
      return 'utf-8'
    } catch {
      // If UTF-8 fails, try to detect if it's ISO-8859-1 or Windows-1252
      // Windows-1252 is more common for Excel CSV files in German-speaking regions
      // and is a superset of ISO-8859-1 for the 0x80-0x9F range
      return 'windows-1252'
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer
      
      // Detect the correct encoding
      const encoding = detectEncoding(arrayBuffer)
      setFileInfo({ name: file.name, encoding })
      const decoder = new TextDecoder(encoding)
      const text = decoder.decode(arrayBuffer)
      
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
              const accessibleVal = r.accessible ?? r.rollstuhl ?? r.kinderwagen ?? r.stroller ?? r.wheelchair
              return name ? { name: String(name).trim(), size, time: timeVal ? String(timeVal).trim() : undefined, toGo: Boolean(toGoVal), accessible: Boolean(accessibleVal), salutation: String(salutationVal || 'Fam').trim() || 'Fam' } : null
            })
            .filter(Boolean) as Group[]
          onImport(groups)
        },
      })
    }
    reader.readAsArrayBuffer(file)
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
      {fileInfo && (
        <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
          Gewählt: {fileInfo.name} ({fileInfo.encoding})
        </div>
      )}
      <div className="paste">
        <textarea placeholder="Or paste CSV text here" onBlur={(e) => handlePaste(e.target.value)} />
      </div>
    </div>
  )
}

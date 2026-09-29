'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

interface ProvinceData {
  provinsi: string
  totalPupuk: number
}

interface MapChartProps {
  data: ProvinceData[]
}

function FitBounds() {
  const map = useMap()
  useEffect(() => {
    map.setView([-2.5, 118], 5)
  }, [map])
  return null
}

function getColor(val: number, max: number): string {
  if (max === 0) return '#f5f5f5'
  const ratio = val / max
  if (ratio === 0) return '#fff3e0'
  if (ratio < 0.2) return '#ffcc80'
  if (ratio < 0.4) return '#ffb74d'
  if (ratio < 0.6) return '#81c784'
  if (ratio < 0.8) return '#4caf50'
  return '#1e6b1e'
}

export default function MapChart({ data }: MapChartProps) {
  const [geoJson, setGeoJson] = useState<any>(null)
  const maxVal = Math.max(...data.map(d => d.totalPupuk), 1)
  const lookup = new Map(data.map(d => [d.provinsi.toLowerCase(), d.totalPupuk]))

  useEffect(() => {
    const cached = localStorage.getItem('indonesia_geojson')
    if (cached) { setGeoJson(JSON.parse(cached)); return }
    fetch('/data/indonesia.geojson')
      .then(r => r.json())
      .then(data => {
        localStorage.setItem('indonesia_geojson', JSON.stringify(data))
        setGeoJson(data)
      })
      .catch(() => setGeoJson(null))
  }, [])

  if (!geoJson) {
    return (
      <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: '12px', color: '#aaa', fontSize: '13px' }}>
        Memuat peta...
      </div>
    )
  }

  return (
    <div style={{ height: '320px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e5e5' }}>
      <MapContainer center={[-2.5, 118]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl={false} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <FitBounds />
        <GeoJSON
          key={JSON.stringify(data)}
          data={geoJson}
          style={(feature) => {
            const name = feature?.properties?.PROVINSI ?? feature?.properties?.state ?? feature?.properties?.name ?? ''
            const val = lookup.get(name.toLowerCase()) ?? 0
            return {
              fillColor: getColor(val, maxVal),
              weight: 1,
              opacity: 1,
              color: '#888',
              fillOpacity: 0.85,
            }
          }}
          onEachFeature={(feature, layer: any) => {
            const name = feature?.properties?.PROVINSI ?? feature?.properties?.state ?? feature?.properties?.name ?? ''
            const val = lookup.get(name.toLowerCase()) ?? 0
            layer.bindTooltip(`<b>${name}</b><br/>${val.toLocaleString('id-ID')} Kg`)
            layer.on({
              mouseover: () => layer.setStyle({ weight: 2, color: '#333', fillOpacity: 1 }),
              mouseout: () => layer.setStyle({ weight: 1, color: '#888', fillOpacity: 0.85 }),
            })
          }}
        />
      </MapContainer>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ListChecks, BedDouble, ScanSearch } from 'lucide-react'
import Navbar from '@/components/Navbar'

export default function Landing() {
  const navigate = useNavigate()
  const [area, setArea] = useState('')
  const [college, setCollege] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (area) params.set('area', area)
    if (college) params.set('college', college)
    navigate(`/find-pg?${params.toString()}`)
  }

  return (
    <div>
      <Navbar />

      <section className="container-page pt-16 pb-14 text-center">
        <h1 className="text-4xl sm:text-5xl font-semibold text-ink-900 tracking-tight">
          Find Your Perfect PG
        </h1>
        <p className="mt-4 text-ink-500 max-w-xl mx-auto">
          Discover verified PGs, check real-time bed availability, and find a place that feels like home.
        </p>

        <form onSubmit={handleSearch} className="mt-8 max-w-2xl mx-auto card p-3 flex flex-col sm:flex-row gap-3">
          <input
            className="input"
            placeholder="Location (e.g. Lakshmipuram, Guntur)"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
          <input
            className="input"
            placeholder="College / Area"
            value={college}
            onChange={(e) => setCollege(e.target.value)}
          />
          <button type="submit" className="btn-primary sm:w-40">
            <Search size={16} /> Search
          </button>
        </form>
        <p className="mt-3 text-xs text-ink-400">Currently supporting Guntur, Andhra Pradesh</p>
      </section>

      <section id="how-it-works" className="container-page py-14 border-t border-ink-100">
        <h2 className="text-xl font-semibold text-ink-900 text-center mb-10">
          Find a PG in 3 simple steps
        </h2>
        <div className="grid sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
          <Step icon={<ScanSearch size={20} />} title="Search" desc="Search PGs near your college or preferred area in Guntur." />
          <Step icon={<ListChecks size={20} />} title="Check Availability" desc="View real-time floor, room, and bed availability." />
          <Step icon={<BedDouble size={20} />} title="Request Your Bed" desc="Send a request and get confirmation from the PG partner." />
        </div>
      </section>

      <footer className="border-t border-ink-100 py-8 text-center text-xs text-ink-400">
        StaySure — Find a place. Check availability. Stay sure.
      </footer>
    </div>
  )
}

function Step({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="w-11 h-11 rounded-card bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <h3 className="font-medium text-ink-900">{title}</h3>
      <p className="text-sm text-ink-500 mt-1">{desc}</p>
    </div>
  )
}

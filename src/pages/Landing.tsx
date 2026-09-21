import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BedDouble, Building2, CheckCircle2, ListChecks, MapPin, ScanSearch, Search, ShieldCheck } from 'lucide-react'
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
  return <div className="min-h-full bg-[#fcfdfb]"><Navbar />
    <section className="relative isolate overflow-hidden bg-brand-900">
      <div className="absolute inset-0 -z-20 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2000&q=90')" }} />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-900/95 via-brand-800/82 to-[#102d28]/70" />
      <div className="absolute -right-28 top-16 -z-10 h-72 w-72 rounded-full bg-brand-300/15 blur-3xl" />
      <div className="container-page pt-20 pb-28 sm:pt-28 sm:pb-32"><div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-brand-50 backdrop-blur-sm"><ShieldCheck size={14} /> Verified PG listings in Guntur</span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-6xl sm:leading-[1.08]">Find a place that feels like home.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-brand-50/90 sm:text-lg">Discover student-friendly stays, compare availability, and make your next move with confidence.</p>
      </div>
      <form onSubmit={handleSearch} className="relative z-10 mx-auto mt-10 max-w-4xl rounded-2xl border border-white/60 bg-white/95 p-3 shadow-[0_20px_60px_rgba(9,38,32,0.32)] backdrop-blur md:flex md:items-center md:gap-2">
        <label className="flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 md:border-r md:border-ink-100"><MapPin className="shrink-0 text-brand-600" size={20} /><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-ink-700">Location</span><input className="w-full bg-transparent text-sm text-ink-800 outline-none placeholder:text-ink-400" placeholder="Lakshmipuram, Guntur" value={area} onChange={(e) => setArea(e.target.value)} /></span></label>
        <label className="flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 md:border-r md:border-ink-100"><Building2 className="shrink-0 text-brand-600" size={20} /><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-ink-700">College or area</span><input className="w-full bg-transparent text-sm text-ink-800 outline-none placeholder:text-ink-400" placeholder="Enter college name" value={college} onChange={(e) => setCollege(e.target.value)} /></span></label>
        <button type="submit" className="btn-primary mt-1 w-full rounded-xl px-6 py-3 md:mt-0 md:w-auto"><Search size={17} /> Search PGs</button>
      </form><p className="mt-4 text-center text-xs text-brand-50/75">Currently supporting Guntur, Andhra Pradesh</p></div>
    </section>
    <section id="how-it-works" className="container-page py-16 sm:py-24"><div className="mx-auto max-w-2xl text-center"><span className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Simple by design</span><h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900">Find a PG in 3 simple steps</h2><p className="mt-3 text-ink-500">Everything you need to find your next stay, without the usual guesswork.</p></div><div className="mt-11 grid gap-5 sm:grid-cols-3"><Step number="01" icon={<ScanSearch size={22} />} title="Search your area" desc="Browse PGs near your college or in the neighbourhood you prefer." /><Step number="02" icon={<ListChecks size={22} />} title="Check availability" desc="See room and bed availability before you spend time reaching out." /><Step number="03" icon={<BedDouble size={22} />} title="Request your bed" desc="Send a request to the PG partner and take the next step with ease." /></div></section>
    <footer className="bg-brand-900 py-10 text-brand-50"><div className="container-page flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left"><div><p className="text-lg font-semibold text-white">StaySure</p><p className="mt-1 text-sm text-brand-100/75">Find a place. Check availability. Stay sure.</p></div><p className="text-xs text-brand-100/60">&copy; {new Date().getFullYear()} StaySure. Made for better student stays.</p></div></footer>
  </div>
}

function Step({ number, icon, title, desc }: { number: string; icon: React.ReactNode; title: string; desc: string }) {
  return <div className="relative rounded-2xl border border-ink-100 bg-white p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(28,63,56,0.11)]"><span className="absolute right-5 top-5 text-xs font-bold text-brand-200">{number}</span><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{icon}</div><h3 className="mt-5 font-semibold text-ink-900">{title}</h3><p className="mt-2 text-sm leading-6 text-ink-500">{desc}</p><CheckCircle2 className="mt-5 text-brand-300" size={18} /></div>
}

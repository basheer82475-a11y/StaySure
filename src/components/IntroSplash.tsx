import { useEffect, useState } from 'react'
import staysureLogo from '@/assets/staysure-logo.png'

export default function IntroSplash() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 2300)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#f8fbfa] px-6 intro-splash">
      <div className="absolute -left-24 top-[-7rem] h-72 w-72 rounded-full bg-brand-100 blur-3xl" />
      <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-brand-200/70 blur-3xl" />
      <div className="relative text-center intro-logo-reveal">
        <div className="mx-auto flex h-48 w-48 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-[0_20px_50px_rgba(28,63,56,0.15)] sm:h-56 sm:w-56">
          <img src={staysureLogo} alt="StaySure" className="w-full scale-[1.12]" />
        </div>
        <div className="mt-7 intro-copy-reveal">
          <p className="text-2xl font-semibold tracking-tight text-brand-900">Find a place that feels like home.</p>
          <div className="mx-auto mt-4 h-1 w-24 overflow-hidden rounded-full bg-brand-100"><div className="h-full rounded-full bg-brand-600 intro-progress" /></div>
        </div>
      </div>
    </div>
  )
}

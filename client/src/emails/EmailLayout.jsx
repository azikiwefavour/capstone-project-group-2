import MedTrailLogo from '../admin/components/MedTrailLogo'

export default function EmailLayout({ label, heading, children }) {
  return (
    <article aria-label={label} className="mx-auto w-full max-w-[600px] bg-white text-left font-sans">
      <header className="flex items-center gap-[10px] bg-[#BDC6EA] px-6 py-[46px] sm:px-[40px]">
        <div className="[&_g]:fill-[#28345B] [&_path]:fill-[#475AA2]">
          <MedTrailLogo />
        </div>
      </header>

      <div className="px-6 pb-[60px] pt-[60px] text-[19px] leading-[1.6] text-[#41434B] sm:px-[50px]">
        <h1 className="m-0 break-words text-[30px] font-bold leading-[1.25] text-[#28345B]">
          {heading}
        </h1>
        {children}
        <p className="mb-0 mt-[20px] font-bold text-[#28345B]">MedTrailNG team.</p>
      </div>
    </article>
  )
}

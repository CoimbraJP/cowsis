export const metadata = {
  title: 'Pasto Inteligente — Pecuária RS',
};

export default function PastoInteligentePage() {
  return (
    <div className="-m-6 md:-m-10 h-screen">
      <iframe
        src="/pasto-inteligente.html"
        title="Pasto Inteligente"
        className="w-full h-full border-0"
      />
    </div>
  );
}

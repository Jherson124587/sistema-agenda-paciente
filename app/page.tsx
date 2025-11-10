export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="relative mb-10 inline-flex items-center gap-3 rounded-full border border-teal-100 bg-white/80 px-6 py-2 text-sm font-medium text-teal-700 shadow-sm backdrop-blur">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow">
            ❤️
          </span>
          <span>Doctoc Clinic Portal</span>
        </div>

        <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
          Bienvenido a tu plataforma de gestión médica
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600">
          Para acceder a tu clínica ingresa la URL con el identificador proporcionado por tu organización:
          <span className="mt-2 block font-semibold text-teal-600">
            /clinic/<span className="font-mono text-cyan-600">[orgId]</span>
          </span>
          Si aún no cuentas con un acceso, solicita el enlace directo a tu clínica o
          al equipo de soporte.
        </p>

        <div className="relative flex w-full max-w-3xl flex-col items-center gap-8 rounded-3xl border border-teal-100 bg-white p-10 text-left shadow-xl">
          <div className="absolute -top-10 right-10 hidden h-24 w-24 rounded-full bg-teal-200/50 blur-2xl md:block" />
          <div className="absolute -bottom-12 left-10 hidden h-28 w-28 rounded-full bg-cyan-200/40 blur-3xl md:block" />

          <div className="relative z-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 p-6 text-white shadow-lg">
              <h2 className="mb-3 text-lg font-semibold">¿Primer ingreso?</h2>
              <p className="text-sm text-teal-50">
                Verifica con tu clínica el enlace personalizado. Cada organización tiene su propio acceso seguro.
              </p>
            </div>

            <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">¿Ya tienes el enlace?</h2>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-teal-500">1.</span>
                  Abre el enlace que recibiste, por ejemplo:
                  <span className="block font-mono text-teal-600">https://tusitio.com/clinic/mi-clinica</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-teal-500">2.</span>
                  Desde allí podrás iniciar sesión o registrarte según las instrucciones de tu clínica.
                </li>
              </ul>
            </div>
          </div>

          <div className="relative z-10 mt-6 rounded-xl bg-teal-50 px-6 py-4 text-sm text-teal-700">
            ¿Necesitas ayuda? Contáctanos en{" "}
            <a href="mailto:soporte@doctoc.com" className="font-semibold text-teal-600 underline decoration-teal-400">
              soporte@doctoc.com
            </a>
            .
          </div>
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import { Nunito } from "next/font/google";

const nunito = Nunito({
	subsets: ["latin"],
	weight: ["700", "800"],
});

export default function DashboardPage() {
	return (
		<main
			className={`${nunito.className} page-rise-in relative min-h-screen overflow-hidden bg-[#182527]`}
		>
			<div className="mx-auto flex min-h-screen w-full max-w-[1250px] flex-col px-7 pb-12 pt-12 md:px-16 md:pt-14">
				<div className="mb-10 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<span className="h-8 w-[3px] rounded-full bg-[#1ce0ad]" aria-hidden />
						<span className="text-[34px] font-extrabold leading-none tracking-[-0.03em] text-[#f3f5f5]">
							skewer.
						</span>
					</div>

					<Link
						href="/"
						className="inline-flex h-10 items-center justify-center rounded-full border border-[#2b4548] px-5 text-[15px] font-bold tracking-[-0.01em] text-[#b6c6c7] transition-colors duration-200 hover:border-[#3e6367] hover:text-[#e5eded]"
					>
						Back
					</Link>
				</div>

				<section className="mx-auto mt-8 w-full max-w-[760px] rounded-3xl border border-[#234145] bg-[#102022]/85 p-6 shadow-[0_30px_80px_-40px_rgba(7,39,46,0.95)] md:p-8">
					<h1 className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-[#f4f6f6] md:text-[56px]">
						Scout
						<br />
						your opponent
					</h1>

					<p className="mt-4 max-w-[500px] text-[16px] font-bold leading-relaxed tracking-[-0.01em] text-[#9db3b5]">
						Choose your platform, enter the username, and launch scouting.
					</p>

					<form action="/scout" method="get" className="mt-8">
						<div>
							<p className="mb-3 text-[14px] font-extrabold uppercase tracking-[0.08em] text-[#88a4a6]">
								Platform
							</p>

							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<label className="group relative block cursor-pointer">
									<input
										type="radio"
										name="platform"
										value="chess.com"
										defaultChecked
										className="peer sr-only"
									/>
									<div className="rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4 text-[20px] font-extrabold tracking-[-0.02em] text-[#a9bcbd] transition-all duration-200 group-hover:border-[#3e6367] group-hover:text-[#d6e1e2] peer-checked:border-[#1ce0ad] peer-checked:bg-[#123730] peer-checked:text-[#dffaf2] peer-checked:shadow-[0_0_0_1px_rgba(28,224,173,0.25)]">
										chess.com
									</div>
								</label>

								<label className="group relative block cursor-pointer">
									<input
										type="radio"
										name="platform"
										value="lichess"
										className="peer sr-only"
									/>
									<div className="rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4 text-[20px] font-extrabold tracking-[-0.02em] text-[#a9bcbd] transition-all duration-200 group-hover:border-[#3e6367] group-hover:text-[#d6e1e2] peer-checked:border-[#1ce0ad] peer-checked:bg-[#123730] peer-checked:text-[#dffaf2] peer-checked:shadow-[0_0_0_1px_rgba(28,224,173,0.25)]">
										lichess
									</div>
								</label>
							</div>
						</div>

						<div className="mt-8">
							<label
								htmlFor="username"
								className="mb-3 block text-[14px] font-extrabold uppercase tracking-[0.08em] text-[#88a4a6]"
							>
								Username
							</label>

							<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
								<input
									id="username"
									name="username"
									type="text"
									required
									autoComplete="off"
									placeholder="e.g. Hikaru"
									className="h-12 w-full rounded-full border border-[#2b4548] bg-[#162b2e] px-5 text-[18px] font-bold tracking-[-0.01em] text-[#e2f0f1] placeholder:text-[#789092] outline-none transition-colors duration-200 focus:border-[#1ce0ad]"
								/>

								<button
									type="submit"
									className="inline-flex h-12 items-center justify-center rounded-full bg-[#1dd5a0] px-8 text-[20px] font-extrabold leading-none tracking-[-0.02em] text-[#07272e] transition-colors duration-200 hover:bg-[#17c592]"
								>
									Scout
								</button>
							</div>
						</div>
					</form>
				</section>
			</div>
		</main>
	);
}

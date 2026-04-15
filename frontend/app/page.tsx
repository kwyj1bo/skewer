import Link from "next/link";
import { Nunito } from "next/font/google";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["700", "800"],
});

export default function Home() {
  return (
    <main
      className={`${nunito.className} page-rise-in relative min-h-screen overflow-hidden bg-[#182527]`}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[1250px] flex-col px-7 pb-12 pt-12 md:flex-row md:items-center md:justify-between md:px-16 md:pt-14">
        <div className="z-10 flex max-w-[370px] flex-col items-start">
          <div className="mb-14 flex items-center gap-3 md:mb-16">
            <span className="h-8 w-[3px] rounded-full bg-[#1ce0ad]" aria-hidden />
            <span className="text-[34px] font-extrabold leading-none tracking-[-0.03em] text-[#f3f5f5]">
              skewer.
            </span>
          </div>

          <h1 className="text-[68px] font-extrabold leading-[1.05] tracking-[-0.03em] text-[#f4f6f6] md:text-[68px]">
            Stalk
            <br />
            your
            <br />
            chess
            <br />
            opponents
          </h1>

          <Link
            href="/dashboard"
            className="mt-12 inline-flex h-11 w-[350px] items-center justify-center rounded-full bg-[#1dd5a0] px-10 text-[30px] font-bold leading-none tracking-[-0.02em] text-[#07272e] transition-colors duration-200 hover:bg-[#17c592]"
          >
            Scout an opponent
          </Link>
        </div>

        <div className="pointer-events-none relative mt-10 h-[300px] w-full max-w-[900px] md:mt-0 md:h-[700px]">
          <div
            className="absolute inset-0 bg-contain bg-right bg-no-repeat"
            role="img"
            aria-label="Black and white king chess pieces"
            style={{ backgroundImage: "url('/chess-homepage.png')" }}
          />
        </div>
      </div>
    </main>
  );
}
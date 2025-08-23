import { ClientOnly } from "./components/ClientOnly";
import Game from "./components/Game";

export default function Home() {
  return (
    <div className="w-full h-screen">
      <ClientOnly>
        <Game />
      </ClientOnly>
    </div>
  );
}

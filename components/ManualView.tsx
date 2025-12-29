
import React from 'react';
import { motion } from 'framer-motion';
import {
  Sun, Heart, Zap,
  Users, ArrowLeft,
  Activity, Coins, Shield, Wind,
  Smartphone, Database, ShieldAlert, Fuel
} from 'lucide-react';

interface ManualViewProps {
  onBack: () => void;
}

const ManualSection: React.FC<{
  icon: React.ReactNode,
  title: string,
  children: React.ReactNode,
  color: string
}> = ({ icon, title, children, color }) => (
  <div className="mb-10 group animate-in fade-in slide-in-from-right-4 duration-500">
    <div className="flex items-center gap-3 mb-4 border-b border-zinc-800 pb-2">
      <div className={`${color} p-2.5 bg-zinc-900 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-black/50`}>
        {icon}
      </div>
      <h3 className="font-display font-black uppercase tracking-widest text-white text-base">{title}</h3>
    </div>
    <div className="pl-2 text-sm text-zinc-400 leading-relaxed space-y-3">
      {children}
    </div>
  </div>
);

const ManualView: React.FC<ManualViewProps> = ({ onBack }) => {
  return (
    <motion.div
      {...({
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 50 }
      } as any)}
      className="absolute inset-0 bg-zinc-950 z-[120] flex flex-col p-6 overflow-y-auto no-scrollbar"
    >
      <div className="flex items-center gap-4 mb-8 sticky top-0 bg-zinc-950/90 backdrop-blur-xl pb-4 z-10 border-b border-white/10">
        <button onClick={onBack} className="p-2.5 bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors active:scale-90 border border-white/5">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-2xl font-display font-black uppercase tracking-tighter text-white">Taktický <span className="text-signal-cyan">Manuál</span></h2>
          <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-[0.3em]">Protokol_v1.4_STABLE</p>
        </div>
      </div>

      <div className="pb-24">
        {/* STATISTIKY */}
        <ManualSection icon={<Activity className="w-5 h-5 text-red-500" />} title="Analýza Atributů" color="text-red-500">
          <p className="text-zinc-500 italic mb-4 font-mono text-xs">"Sleduj své životní funkce, nebo se staň součástí historie sektoru."</p>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-2 text-red-500">
                <Heart className="w-4 h-4" /> <span className="font-black uppercase tracking-widest text-xs">Vitalita (HP)</span>
              </div>
              <p className="text-xs">Tvoje biologická integrita. Pokud klesne na <span className="text-red-400 font-bold">0</span>, tvoje postava je vyřazena z mise. HP obnovuj lékárničkami nebo odpočinkem v bezpečných zónách.</p>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-2 text-signal-cyan">
                <Zap className="w-4 h-4" /> <span className="font-black uppercase tracking-widest text-xs">Energie (Mana)</span>
              </div>
              <p className="text-xs">Palivo pro tvoje speciální schopnosti, technologické moduly a magické artefakty. Bez energie nemůžeš používat aktivní karty z Batohu.</p>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-2 text-signal-amber">
                <Coins className="w-4 h-4" /> <span className="font-black uppercase tracking-widest text-xs">Kredity (Gold)</span>
              </div>
              <p className="text-xs">Univerzální měna pro obchodování u NPC a na Sektorové burze. Slouží k nákupu vybavení nebo uplácení stráží.</p>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-2 text-zinc-400">
                <Shield className="w-4 h-4" /> <span className="font-black uppercase tracking-widest text-xs">Brnění (Armor)</span>
              </div>
              <p className="text-xs">Pasivní ochrana. Snižuje příchozí poškození (DMG) při neúspěšných hodech kostkou nebo útocích nepřátel.</p>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-2 text-orange-500">
                <Fuel className="w-4 h-4" /> <span className="font-black uppercase tracking-widest text-xs">Palivo (Fuel)</span>
              </div>
              <p className="text-xs">Klíčový zdroj pro manévrování lodí. Skenování nových karet a sektorů spotřebovává palivo. Pokud klesne na nulu, nebudeš moci provádět hloubkové skeny.</p>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-2 text-cyan-400">
                <Wind className="w-4 h-4" /> <span className="font-black uppercase tracking-widest text-xs">Kyslík (O2)</span>
              </div>
              <p className="text-xs">Kritické v nehostinných sektorech. Pokud hodnota klesne na nulu, začneš ztrácet HP každé kolo. Doplňuj kyslíkovými bombami nebo filtrací na stanicích.</p>
            </div>
          </div>
        </ManualSection>

        {/* CHOVÁNÍ APPLIKACE */}
        <ManualSection icon={<Smartphone className="w-5 h-5 text-signal-cyan" />} title="Protokoly Systému" color="text-signal-cyan">
          <p className="text-zinc-300">Nexus OS je hybridní rozhraní. Aplikace se chová dynamicky podle tvého postupu:</p>
          <ul className="space-y-4 mt-2">
            <li className="flex gap-3">
              <div className="p-2 bg-white/5 rounded text-signal-cyan shrink-0 h-fit"><Database className="w-4 h-4" /></div>
              <div>
                <span className="text-white font-bold block text-xs uppercase tracking-widest mb-1">Digitální Batoh</span>
                <p className="text-xs">Všechny karty, které naskenuješ a <span className="text-signal-cyan font-bold">ULOŽÍŠ</span>, zůstávají trvale v tvém inventáři. Jsou dostupné i pro budoucí mise, dokud je neprodáš nebo nespotřebuješ.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="p-2 bg-white/5 rounded text-orange-400 shrink-0 h-fit"><Activity className="w-4 h-4" /></div>
              <div>
                <span className="text-white font-bold block text-xs uppercase tracking-widest mb-1">Tahový Systém</span>
                <p className="text-xs">Hra probíhá v synchronizovaných kolech. Každý hráč v sektoru se střídá. Během svého tahu provádíš akce a následně musíš tah manuálně ukončit pro dalšího člena týmu.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="p-2 bg-white/5 rounded text-yellow-500 shrink-0 h-fit"><Sun className="w-4 h-4" /></div>
              <div>
                <span className="text-white font-bold block text-xs uppercase tracking-widest mb-1">Denní/Noční Cyklus</span>
                <p className="text-xs">Aplikace v reálném čase mění pravidla hry. V noci (po 20:00) mají monstra vyšší útok a karty mohou vykazovat jiné efekty. Noční variantu poznáš podle <span className="text-purple-400 font-bold">fialového pruhu</span> a blikajícího štítku <span className="text-blue-400 font-bold">NOC</span> v rohu karty.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="p-2 bg-white/5 rounded text-purple-500 shrink-0 h-fit"><Users className="w-4 h-4" /></div>
              <div>
                <span className="text-white font-bold block text-xs uppercase tracking-widest mb-1">Sdílený Sektor</span>
                <p className="text-xs">V režimu Tým vidí tvoje jednotka tvůj stav v reálném čase. Globální události (Dilemata, Bossové) ovlivňují celou místnost a vyžadují týmovou spolupráci.</p>
              </div>
            </li>
          </ul>
        </ManualSection>

        {/* RADY */}
        <ManualSection icon={<ShieldAlert className="w-5 h-5 text-signal-amber" />} title="Rady pro Přežití" color="text-signal-amber">
          <div className="space-y-4">
            <div className="p-4 bg-signal-amber/5 border-l-4 border-signal-amber rounded-r-xl">
              <p className="text-xs text-zinc-200">"Před vstupem do temného sektoru se ujisti, že máš v Batohu dostatek lékárniček a funkční brnění. Bez integrity jsi jen maso pro mutanty."</p>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-xs">
              <li>Využívej <span className="text-white font-bold underline">Sektorovou burzu</span> pro zbavení se nepotřebných karet za kredity.</li>
              <li>Některé karty jsou <span className="text-signal-hazard font-bold">SPOTŘEBOVATELNÉ</span> – po jednom použití zmizí z tvého Batohu navždy.</li>
              <li>Při skenování kódu se dívej na <span className="text-signal-cyan font-bold">RARITU</span>. Noční varianty označené štítkem <span className="text-blue-400 font-bold">NOC</span> mají často unikátní statistiky.</li>
              <li>Pozor na <span className="text-orange-500 font-bold">PALIVO</span> – pokud ti dojde, nebude možné skenovat žádné nové karty!</li>
            </ul>
          </div>
        </ManualSection>

        <div className="mt-12 bg-signal-cyan/5 border border-signal-cyan/20 p-8 rounded-3xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Smartphone className="w-20 h-20" />
          </div>
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.3em] mb-2">Nexus_OS</p>
          <p className="text-xs text-zinc-400 font-bold">Verze Jádra: 1.4.1_STABLE_120FPS<br />Status: <span className="text-green-500 animate-pulse uppercase">Link_Stable</span></p>
          <p className="text-[9px] text-zinc-600 mt-4 font-mono tracking-widest">Vyvinuto DeXoArt.</p>
        </div>
      </div>
    </motion.div>
  );
};

export default ManualView;

"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Ambulance,
  BadgeEuro,
  Clock3,
  ExternalLink,
  Helicopter,
  ArrowDownToLine,
  Languages,
  MapPin,
  MountainSnow,
  RadioTower,
  ShieldAlert,
} from "lucide-react";
import {
  ratingLabels,
  regionalPolishNames,
  regionalRescueNotes,
  regionalRescueRatings,
  rescueProfiles,
} from "./rescue-data";
import type { MapMetric, RescueRegion } from "./RescueMap";
import styles from "./MapsModule.module.css";

const RescueMap = dynamic(
  () => import("./RescueMap").then((module) => module.RescueMap),
  {
    ssr: false,
    loading: () => <div className={styles.mapLoading}>Ładowanie mapy…</div>,
  },
);

const metrics: Array<{ value: MapMetric; label: string }> = [
  { value: "readiness", label: "Gotowość" },
  { value: "time", label: "Czas dotarcia" },
  { value: "helicopter", label: "Śmigłowiec" },
];

export function MapsModule() {
  const [metric, setMetric] = useState<MapMetric>("readiness");
  const [regions, setRegions] = useState<RescueRegion[]>([]);
  const [showClimbingAreas, setShowClimbingAreas] = useState(true);
  const [detailsWidth, setDetailsWidth] = useState(374);
  const [selectedRegion, setSelectedRegion] = useState<RescueRegion | null>(
    null,
  );
  const profile = selectedRegion
    ? rescueProfiles[selectedRegion.countryCode]
    : undefined;
  const regionalRating = selectedRegion
    ? regionalRescueRatings[selectedRegion.id]
    : undefined;
  const sortedRegions = useMemo(
    () =>
      [...regions]
        .filter((region) => rescueProfiles[region.countryCode])
        .sort((left, right) => left.name.localeCompare(right.name, "pl")),
    [regions],
  );
  const handleRegionsLoaded = useCallback((loadedRegions: RescueRegion[]) => {
    setRegions(loadedRegions);
  }, []);
  const resizeDetails = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      const workspace = event.currentTarget.parentElement;
      if (!workspace) return;
      const bounds = workspace.getBoundingClientRect();
      const maximumWidth = Math.max(300, Math.min(640, bounds.width - 429));
      setDetailsWidth(
        Math.min(maximumWidth, Math.max(300, bounds.right - event.clientX)),
      );
    },
    [],
  );

  return (
    <div className={styles.page}>
      <div
        className={styles.workspace}
        style={{ "--details-width": `${detailsWidth}px` } as CSSProperties}
      >
        <div className={styles.mapColumn}>
          <div className={styles.toolbar}>
            <div className={styles.segmented} aria-label="Warstwa mapy">
              {metrics.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={metric === item.value}
                  onClick={() => setMetric(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className={styles.layerToggle}>
              <input
                type="checkbox"
                checked={showClimbingAreas}
                onChange={(event) => setShowClimbingAreas(event.target.checked)}
              />
              <MountainSnow aria-hidden="true" size={17} />
              Rejony wspinaczkowe
            </label>
            <label className={styles.regionSelect}>
              <MapPin aria-hidden="true" size={17} />
              <select
                aria-label="Wybierz region"
                value={selectedRegion?.id ?? ""}
                onChange={(event) => {
                  const region = regions.find(
                    (item) => item.id === event.target.value,
                  );
                  if (region) setSelectedRegion(region);
                }}
              >
                <option value="" disabled>
                  Wybierz region
                </option>
                {sortedRegions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name} · {rescueProfiles[region.countryCode].country}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <section
            className={styles.mapPanel}
            aria-label="Mapa ratownictwa w Europie"
          >
            <RescueMap
              metric={metric}
              selectedRegion={selectedRegion}
              onRegionChange={setSelectedRegion}
              onRegionsLoaded={handleRegionsLoaded}
              showClimbingAreas={showClimbingAreas}
              layoutWidth={detailsWidth}
            />
            <div className={styles.legend}>
              <span>
                <i className={styles.elite} /> Czołówka
              </span>
              <span>
                <i className={styles.leading} /> Bardzo dobra
              </span>
              <span>
                <i className={styles.strong} /> Dobra
              </span>
              <span>
                <i className={styles.adequate} /> Wystarczająca
              </span>
              <span>
                <i className={styles.guarded} /> Uwaga
              </span>
              <span>
                <i className={styles.limited} /> Ograniczona
              </span>
              <span>
                <i className={styles.critical} /> Wysokie ryzyko
              </span>
              <span>
                <i className={styles.unknown} /> Brak danych
              </span>
              <span className={styles.legendNote}>
                <Helicopter aria-hidden="true" size={15} /> dostępny śmigłowiec
              </span>
              <span className={styles.legendNote}>
                <span className={styles.hoistLegendIcon}>
                  <Helicopter aria-hidden="true" size={15} />
                  <ArrowDownToLine aria-hidden="true" size={10} />
                </span>
                z wyciągarką
              </span>
              <span>
                <i className={styles.climbing} /> Rejon wspinaczkowy
              </span>
            </div>
          </section>
        </div>
        <div
          className={styles.panelDivider}
          role="separator"
          aria-label="Zmień szerokość mapy i panelu szczegółów"
          aria-orientation="vertical"
          aria-valuemin={300}
          aria-valuemax={640}
          aria-valuenow={detailsWidth}
          tabIndex={0}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={resizeDetails}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              setDetailsWidth((width) => Math.min(640, width + 24));
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              setDetailsWidth((width) => Math.max(300, width - 24));
            }
          }}
        />
        <aside className={styles.details} aria-live="polite">
          <header className={styles.intro}>
            <span className={styles.eyebrow}>
              RESCUE CAPABILITIES AND REALITY
            </span>
            <h1>Gdzie nadejdzie pomoc?</h1>
            <p>Ratownictwo górskie, karetki i śmigłowce w Europie.</p>
            <div className={styles.notice}>
              <ShieldAlert aria-hidden="true" size={18} />
              <span>
                Dane orientacyjne. W nagłym wypadku dzwoń pod
                <strong> 112</strong>.
              </span>
            </div>
          </header>
          {selectedRegion ? (
            <>
              <div className={styles.detailsHeader}>
                <span>{profile?.country ?? selectedRegion.countryCode}</span>
                <h2>{selectedRegion.name}</h2>
                {regionalPolishNames[selectedRegion.id] ? (
                  <p className={styles.regionTranslation}>
                    {regionalPolishNames[selectedRegion.id]}
                  </p>
                ) : null}
                {profile ? (
                  <span
                    className={`${styles.badge} ${styles[regionalRating ?? profile.rating]}`}
                  >
                    {ratingLabels[regionalRating ?? profile.rating]}
                    {regionalRating ? " · ocena regionalna" : ""}
                  </span>
                ) : null}
              </div>
              {profile ? (
                <>
                  {regionalRescueNotes[selectedRegion.id] ? (
                    <p className={styles.summary}>
                      {regionalRescueNotes[selectedRegion.id]}
                    </p>
                  ) : null}
                  <p className={styles.summary}>{profile.summary}</p>
                  <div className={styles.capabilityGrid}>
                    <CapabilityStat
                      label="Śmigłowce"
                      value={profile.fleet.helicoptersLabel}
                    />
                    <CapabilityStat
                      label="Z wyciągarką"
                      value={profile.fleet.hoistEquippedLabel}
                    />
                    <CapabilityStat
                      label="Bazy"
                      value={profile.fleet.basesLabel}
                    />
                  </div>
                  <div className={styles.factList}>
                    <Fact
                      icon={MountainSnow}
                      label="Ratownictwo górskie"
                      value={profile.mountainService}
                    />
                    <Fact
                      icon={Ambulance}
                      label="Karetka"
                      value={profile.ambulanceTime}
                    />
                    <Fact
                      icon={Clock3}
                      label="Teren trudny"
                      value={profile.mountainTime}
                    />
                    <Fact
                      icon={Helicopter}
                      label="HEMS / SAR"
                      value={profile.hems}
                    />
                    <Fact
                      icon={RadioTower}
                      label={`Pokrycie regionu: ${selectedRegion.name}`}
                      value={profile.fleet.regionalAllocation}
                    />
                    <Fact icon={BadgeEuro} label="Koszt" value={profile.cost} />
                    <Fact
                      icon={Languages}
                      label="Kontakt"
                      value={profile.language}
                    />
                  </div>
                  <div className={styles.caveats}>
                    <strong>Co może zawieść</strong>
                    {profile.caveats.map((caveat) => (
                      <p key={caveat}>{caveat}</p>
                    ))}
                  </div>
                  <footer className={styles.sources}>
                    <span>
                      Pewność danych: <strong>{profile.confidence}</strong>
                    </span>
                    <div>
                      {profile.sources.map((source) => (
                        <a
                          key={source.url}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {source.label}
                          <ExternalLink aria-hidden="true" size={13} />
                        </a>
                      ))}
                    </div>
                  </footer>
                </>
              ) : (
                <EmptyDetails />
              )}
            </>
          ) : (
            <div className={styles.emptyDetails}>Wybierz region na mapie.</div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Ambulance;
  label: string;
  value: string;
}) {
  return (
    <div className={styles.fact}>
      <Icon aria-hidden="true" size={19} />
      <div>
        <span>{label}</span>
        <p>{value}</p>
      </div>
    </div>
  );
}

function CapabilityStat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.capabilityStat}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyDetails() {
  return (
    <div className={styles.emptyDetails}>
      <ShieldAlert aria-hidden="true" size={28} />
      <h3>Brak zweryfikowanego profilu</h3>
      <p>
        Granice regionu są dostępne, ale dane o zdolnościach ratowniczych nie
        zostały jeszcze opracowane.
      </p>
    </div>
  );
}

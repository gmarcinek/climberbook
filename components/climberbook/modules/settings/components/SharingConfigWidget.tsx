"use client";

import { useState } from "react";
import { Button } from "@/components/climberbook/common/Button";
import { Input } from "@/components/climberbook/common/FormControls";
import { FormActions } from "@/components/climberbook/common/FormLayout";
import { Panel } from "@/components/climberbook/common/Panel";
import {
  moduleEyebrowStyle,
  sectionTitleStyle,
} from "@/components/climberbook/common/styles";
import {
  defaultStimulusSharingLabels,
  readStimulusSharingConfig,
  stimulusSharingRanges,
  stimulusSharingStorageKey,
} from "@/lib/stimulus-sharing-config";

export function SharingConfigWidget() {
  const [labels, setLabels] = useState(
    () => readStimulusSharingConfig().labels,
  );
  const [saved, setSaved] = useState(false);

  function save() {
    window.localStorage.setItem(
      stimulusSharingStorageKey,
      JSON.stringify({ labels: labels.map((label) => label.trim()) }),
    );
    setSaved(true);
  }

  function reset() {
    setLabels([...defaultStimulusSharingLabels]);
    setSaved(false);
  }

  return (
    <Panel gap="md">
      <div>
        <p style={moduleEyebrowStyle}>Udostępnianie</p>
        <h2 style={sectionTitleStyle}>Sharing config</h2>
      </div>
      <div style={{ display: "grid", gap: "10px" }}>
        {stimulusSharingRanges.map((range, index) => (
          <label
            key={range}
            style={{
              alignItems: "center",
              display: "grid",
              gap: "10px",
              gridTemplateColumns: "100px minmax(0, 1fr)",
            }}
          >
            <span style={{ color: "var(--muted)", fontWeight: 700 }}>
              {range}
            </span>
            <Input
              value={labels[index] ?? ""}
              onChange={(event) =>
                setLabels((current) =>
                  current.map((label, labelIndex) =>
                    labelIndex === index ? event.target.value : label,
                  ),
                )
              }
              maxLength={72}
            />
          </label>
        ))}
      </div>
      <FormActions layout="inline">
        <Button onClick={save}>Zapisz konfigurację</Button>
        <Button variant="secondary" onClick={reset}>
          Przywróć domyślne
        </Button>
        {saved ? (
          <span style={{ color: "var(--muted)" }}>Zapisano.</span>
        ) : null}
      </FormActions>
    </Panel>
  );
}

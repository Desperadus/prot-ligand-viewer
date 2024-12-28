import React, { useState, useEffect, useRef } from 'react';
    import * as THREE from 'three';
    import './index.css';

    function App() {
      const [ligands, setLigands] = useState([]);
      const [selectedLigand, setSelectedLigand] = useState(null);
      const [statistics, setStatistics] = useState(null);
      const viewerRef = useRef(null);
      const [pdbData, setPdbData] = useState(null);
      const [ligandData, setLigandData] = useState(null);
      const [view, setView] = useState(null);

      useEffect(() => {
        fetch('/ligand_data.json')
          .then(response => response.json())
          .then(data => {
            setLigands(data.ligands);
            setPdbData(data.pdb_data);
          })
          .catch(error => console.error('Error loading ligand data:', error));
      }, []);

      useEffect(() => {
        if (viewerRef.current && pdbData) {
          if (view) {
            view.clear();
          }
          const view = new $3Dmol.GLViewer(viewerRef.current, { backgroundColor: 'white' });
          setView(view);
          view.addModel(pdbData, "pdb");
          view.setStyle({}, { cartoon: { color: 'spectrum' } });
          view.zoomTo();
        }
      }, [viewerRef, pdbData]);

      useEffect(() => {
        if (view && selectedLigand) {
          view.removeModel(1);
          fetch(selectedLigand.sdf_path)
            .then(response => response.text())
            .then(sdfData => {
              setLigandData(sdfData);
              view.addModel(sdfData, "sdf");
              view.setStyle({ model: 1 }, { stick: { radius: 0.2, color: 'blue' } });
              view.zoomTo();
            })
            .catch(error => console.error('Error loading SDF data:', error));
          setStatistics(selectedLigand.statistics);
        }
      }, [view, selectedLigand]);

      const handleLigandSelect = (ligand) => {
        setSelectedLigand(ligand);
      };

      return (
        <div className="viewer-container">
          <div className="protein-viewer" ref={viewerRef}></div>
          <div className="ligand-selector">
            <h2>Ligands</h2>
            <ul className="ligand-list">
              {ligands.map((ligand, index) => (
                <li
                  key={index}
                  onClick={() => handleLigandSelect(ligand)}
                  className={selectedLigand === ligand ? 'selected' : ''}
                >
                  {ligand.name}
                </li>
              ))}
            </ul>
            {statistics && (
              <div className="statistics-display">
                <h3>Statistics</h3>
                {Object.entries(statistics).map(([key, value]) => (
                  <p key={key}>
                    <strong>{key}:</strong> {value}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    export default App;

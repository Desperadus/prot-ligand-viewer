import React, { useState, useEffect, useRef } from 'react';
    import './index.css';
    import * as $3Dmol from '3dmol';

    function App() {
      const [ligands, setLigands] = useState([]);
      const [selectedLigand, setSelectedLigand] = useState(null);
      const [statistics, setStatistics] = useState(null);
      const viewerRef = useRef(null);
      const [pdbData, setPdbData] = useState(null);
      const [isLoading, setIsLoading] = useState(false);
      const [error, setError] = useState(null);
      const [view, setView] = useState(null);

      useEffect(() => {
        const fetchData = async () => {
          setIsLoading(true);
          setError(null);
          try {
            const response = await fetch('/ligand_data.json');
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setLigands(data.ligands);
            setPdbData(data.pdb_data);
            if (data.ligands.length > 0) {
              setSelectedLigand(data.ligands[0]);
            }
          } catch (error) {
            setError(error.message);
            console.error('Error loading ligand data:', error);
          } finally {
            setIsLoading(false);
          }
        };

        fetchData();
      }, []);

      useEffect(() => {
        if (!viewerRef.current || !pdbData) return;

        const newView = new $3Dmol.GLViewer(viewerRef.current, { backgroundColor: 'white' });
        setView(newView);

        const loadPdb = async () => {
          setIsLoading(true);
          try {
            const response = await fetch(pdbData);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const pdbContent = await response.text();
            newView.addModel(pdbContent, "pdb");
            newView.setStyle({}, { cartoon: { color: 'spectrum' } });
            newView.zoomTo();
            newView.render();
          } catch (error) {
            setError(error.message);
            console.error('Error loading PDB data:', error);
          } finally {
            setIsLoading(false);
          }
        };

        loadPdb();

        return () => {
          if (newView) {
            newView.removeAllModels();
            newView.destroy();
          }
        };
      }, [pdbData]);

      useEffect(() => {
        if (!viewerRef.current || !selectedLigand || !view) return;

        const loadLigand = async () => {
          setIsLoading(true);
          setError(null);
          try {
            const pdbResponse = await fetch(pdbData);
            if (!pdbResponse.ok) {
              throw new Error(`HTTP error! status: ${pdbResponse.status}`);
            }
            const pdbContent = await pdbResponse.text();
            view.removeAllModels();
            view.addModel(pdbContent, "pdb");
            view.setStyle({}, { cartoon: { color: 'spectrum' } });

            const sdfResponse = await fetch(selectedLigand.sdf_path);
            if (!sdfResponse.ok) {
              throw new Error(`HTTP error! status: ${sdfResponse.status}`);
            }
            const sdfData = await sdfResponse.text();
            view.addModel(sdfData, "sdf");
            view.setStyle({ model: 1 }, { stick: { radius: 0.2, color: 'blue' } });
            view.zoomTo();
            view.render();
            setStatistics(selectedLigand.statistics);
          } catch (error) {
            setError(error.message);
            console.error('Error loading ligand data:', error);
          } finally {
            setIsLoading(false);
          }
        };

        loadLigand();
      }, [selectedLigand, pdbData, view]);

      const handleLigandSelect = (ligand) => {
        setSelectedLigand(ligand);
      };

      return (
        <div className="viewer-container">
          <div className="protein-viewer" ref={viewerRef}>
            {isLoading && <p>Loading...</p>}
            {error && <p>Error: {error}</p>}
          </div>
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

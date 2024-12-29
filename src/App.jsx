import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import * as $3Dmol from '3dmol';

function App() {
  // Add new state for display style
  const [displayStyle, setDisplayStyle] = useState('cartoon');
  const [ligands, setLigands] = useState([]);
  const [selectedLigand, setSelectedLigand] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const viewerRef = useRef(null);
  const [pdbData, setPdbData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState(null);
  const [initialZoomDone, setInitialZoomDone] = useState(false);
  const [sdfData, setSdfData] = useState(null);

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

    // Initialize viewer with proper sizing
    const newView = new $3Dmol.GLViewer(viewerRef.current, {
      backgroundColor: 'white',
      defaultcolors: $3Dmol.rasmolElementColors
    });
    
    // Ensure viewer fills container
    const resize = () => {
      const parent = viewerRef.current;
      if (parent && newView) {
        newView.resize();
      }
    };

    // Add resize listener
    window.addEventListener('resize', resize);
    resize();
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
        
        // Add surface representation
        newView.addSurface($3Dmol.SurfaceType.VDW, {
          opacity: 0.85,
          color: 'white'
        });

        newView.zoomTo();
        newView.render();
        setInitialZoomDone(true);
      } catch (error) {
        setError(error.message);
        console.error('Error loading PDB data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPdb();

    return () => {
      window.removeEventListener('resize', resize);
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
        
        // Apply selected display style
        const styleObject = {};
        if (displayStyle === 'cartoon') {
          styleObject.cartoon = { color: 'spectrum' };
        } else if (displayStyle === 'line') {
          styleObject.line = {};
        } else if (displayStyle === 'stick') {
          styleObject.stick = {};
        } 
        view.setStyle({}, styleObject);

        const sdfResponse = await fetch(selectedLigand.sdf_path);
        if (!sdfResponse.ok) {
          throw new Error(`HTTP error! status: ${sdfResponse.status}`);
        }
        const sdfData = await sdfResponse.text();
        setSdfData(sdfData);
        view.addModel(sdfData, "sdf");
        view.setStyle({ model: 1 }, { stick: { radius: 0.2 } });
        
        // Center and zoom to ligand only if initial zoom is not done
        if (!initialZoomDone) {
          view.zoomTo({ model: 1 });
        }
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
  }, [selectedLigand, pdbData, view, displayStyle]);

  const handleLigandSelect = (ligand) => {
    setSelectedLigand(ligand);
  };

  const handleDownload = () => {
    if (!sdfData) return;
    const blob = new Blob([sdfData], { type: 'chemical/x-mdl-sdfile' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedLigand.name}.sdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="viewer-container">
      <h1>TrmD (4yvg) and its Inhibitors</h1>
      <div className="viewer-content">
        <div className="ligand-selector">
          <h2>Display Options</h2>
          <select 
            value={displayStyle} 
            onChange={(e) => setDisplayStyle(e.target.value)}
          >
            <option value="cartoon">Cartoon</option>
            <option value="line">Line</option>
            <option value="stick">Stick</option>
          </select>
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
          <button onClick={handleDownload} disabled={!sdfData}>
            Download SDF
          </button>
        </div>
        <div className="protein-viewer" ref={viewerRef}>
          {isLoading && <p>Loading...</p>}
          {error && <p>Error: {error}</p>}
        </div>
      </div>
    </div>
  );
}

export default App;

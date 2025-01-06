let uploadedFilename = ''; // Global variable to store the uploaded filename

async function uploadGeoJSON() {
    const formData = new FormData();
    const fileInput = document.querySelector('#geojsonFile');
    const file = fileInput.files[0];

    if (!file) {
      Swal.fire({
        title: 'Information',
        text: 'Please select a GeoJSON file to upload.',
        icon: 'info',
        confirmButtonText: 'OK'
    });
        return;
    }

    formData.append('geojson', file);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            alert(`Error: ${data.error}`);
        } else {
          Swal.fire({
            title: 'Information',
            text: data.message,
            icon: 'info',
            confirmButtonText: 'OK'
        });
                    uploadedFilename = file.name; // Store the filename globally
            console.log(`Uploaded file: ${uploadedFilename}`);
            refreshMap(); // Refresh the map to show the uploaded GeoJSON
        }
    } catch (error) {
        console.error('Fetch error:', error);
        alert('An error occurred while uploading the file. Please try again.');
    }
}


// script.js

async function launchCalculation() {
  // 1. Check if a GeoJSON filename is known (the user either uploaded or picked a predefined file)
  if (!uploadedFilename) {
    Swal.fire({
      title: 'Avertissement',
      text: 'Aucun fichier GeoJSON disponible. Veuillez téléverser ou sélectionner un fichier avant de calculer.',
      icon: 'warning',
      confirmButtonText: 'OK'
    });
    return;
  }

  // 2. Collect user inputs
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  // Gather selected indices (R, C, LS, K, RUSLE, NDVI, etc.)
  const indices = [];
  if (document.getElementById('rCheckbox')?.checked)   indices.push('R');
  if (document.getElementById('cCheckbox')?.checked)   indices.push('C');
  if (document.getElementById('LSCheckbox')?.checked)  indices.push('LS');
  if (document.getElementById('KCheckbox')?.checked)   indices.push('K');
  if (document.getElementById('RUSLECheckbox')?.checked) indices.push('RUSLE');
  if (document.getElementById('ndviCheckbox')?.checked) indices.push('NDVI');
  // Add more if needed...

  // 3. Check if at least one index is selected
  if (indices.length === 0) {
    Swal.fire({
      title: 'Avertissement',
      text: 'Veuillez sélectionner au moins un indice/facteur.',
      icon: 'warning',
      confirmButtonText: 'OK'
    });
    return;
  }

  // 4. (Optional) Check if user wants monthly time series
  const monthlyTimeseriesEnabled = document.getElementById('monthlyTimeSeriesCheckbox')?.checked || false;

  // 5. Prepare the request body
  const bodyData = {
    filename: uploadedFilename,
    start_date: startDate,
    end_date: endDate,
    indices: indices,
    scale: 10,                // e.g., resolution in meters
    monthly_timeseries: monthlyTimeseriesEnabled
  };

  // 6. Show a SweetAlert2 loading indicator (instead of a spinner)
  Swal.fire({
    title: 'Calcul en cours...',
    text: 'Veuillez patienter.',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    // 7. Send the request to /calculate
    const response = await fetch('/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
    });

    const data = await response.json();
    console.log('Full Response Data:', data);

    // 8. Check if response is successful
    if (!response.ok) {
      Swal.fire({
        title: 'Erreur',
        text: data.error || 'Une erreur est survenue lors du calcul.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } else {
      // 9. Close loading alert
      Swal.close();

      // 10. Show success alert
      Swal.fire({
        title: 'Succès',
        text: data.message || 'Calcul terminé avec succès.',
        icon: 'success',
        confirmButtonText: 'OK'
      });

     

      // 12. Display or update download links if provided
      if (data.download_links) {
        populateDownloadLinks(data.download_links);
      }

      // 13. If monthly time series were requested, handle the returned data
      if (monthlyTimeseriesEnabled && data.time_series_data) {
        // For example, you could draw a chart here
        // or show it in a modal or anywhere you like.
        console.log('Time Series Data:', data.time_series_data);

        renderTimeSeriesChart(data.time_series_data);
      }

       // 11. Refresh the map to display updated layers
      refreshMap();
    }
  } catch (error) {
    // 14. Catch any network or JS errors
    console.error('Error during calculation:', error);
    Swal.fire({
      title: 'Erreur',
      text: 'Une erreur s\'est produite lors de l\'opération.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }

  
  
    //// function 
    function renderTimeSeriesChart(data) {
      if (!data || data.length === 0) {
        Swal.fire({
          title: 'Info',
          text: 'Aucune donnée de série temporelle disponible.',
          icon: 'info',
          confirmButtonText: 'OK',
        });
        return;
      }
    
      // Create a container for the table, buttons, and chart
      let containerHTML = `
        <div>
          <button id="downloadDataBtn" style="margin-bottom: 10px;" class="btn btn-success">Télécharger les données</button>
          <div style="margin-bottom: 20px;">
            <button class="btn btn-primary" id="chartRBtn">Afficher R</button>
            <button class="btn btn-primary" id="chartCBtn">Afficher C</button>
            <button class="btn btn-primary" id="chartNDVIBtn">Afficher NDVI</button>
            <button class="btn btn-primary" id="chartRUSLEBtn">Afficher RUSLE</button>
          </div>
          <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 20px;">
            <thead>
              <tr>
                <th style="border: 1px solid #ccc; padding: 8px;">Date</th>
                <th style="border: 1px solid #ccc; padding: 8px;">R</th>
                <th style="border: 1px solid #ccc; padding: 8px;">C</th>
                <th style="border: 1px solid #ccc; padding: 8px;">NDVI</th>
                <th style="border: 1px solid #ccc; padding: 8px;">RUSLE</th>
              </tr>
            </thead>
            <tbody>
      `;
    
      // Populate table rows
      data.forEach(item => {
        containerHTML += `
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">${item.date || '-'}</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${item.R !== undefined ? item.R.toFixed(2) : '-'}</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${item.C !== undefined ? item.C.toFixed(3) : '-'}</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${item.NDVI !== undefined ? item.NDVI.toFixed(3) : '-'}</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${item.RUSLE !== undefined ? item.RUSLE.toFixed(3) : '-'}</td>
          </tr>
        `;
      });
    
      containerHTML += `
            </tbody>
          </table>
          <canvas id="indicatorChart" style="width: 100%; height: 400px; border: 1px solid #ccc;"></canvas>
        </div>
      `;
    
      // Show the table, buttons, and chart in a SweetAlert2 modal
      Swal.fire({
        title: 'Tableau des données de la série temporelle',
        html: containerHTML,
        width: '90%',
        showCloseButton: true,
        confirmButtonText: 'Fermer',
        didRender: () => {
          // Attach event listeners after rendering
    
          // Download Data as CSV
          document.getElementById('downloadDataBtn').addEventListener('click', () => {
            const csvContent = [
              ['Date', 'R', 'C', 'NDVI', 'RUSLE'], // Headers
              ...data.map(item => [
                item.date,
                item.R !== undefined ? item.R.toFixed(2) : '',
                item.C !== undefined ? item.C.toFixed(3) : '',
                item.NDVI !== undefined ? item.NDVI.toFixed(3) : '',
                item.RUSLE !== undefined ? item.RUSLE.toFixed(3) : '',
              ])
            ].map(e => e.join(',')).join('\n');
    
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'time_series_data.csv');
            link.click();
          });
    
          // Chart Rendering Logic
          let chartInstance;
    
          function updateChart(indicator, label) {
            const chartData = data.map(item => item[indicator]);
            const labels = data.map(item => item.date);
    
            const ctx = document.getElementById('indicatorChart').getContext('2d');
    
            // Destroy previous chart if it exists
            if (chartInstance) {
              chartInstance.destroy();
            }
    
            // Create a new chart
            chartInstance = new Chart(ctx, {
              type: 'line',
              data: {
                labels: labels,
                datasets: [{
                  label: label,
                  data: chartData,
                  borderColor: 'blue',
                  fill: false,
                }],
              },
              options: {
                responsive: true,
                scales: {
                  x: { title: { display: true, text: 'Date' } },
                  y: { title: { display: true, text: label } },
                },
              },
            });
          }
    
          // Attach event listeners for chart buttons
          document.getElementById('chartRBtn').addEventListener('click', () => updateChart('R', 'R'));
          document.getElementById('chartCBtn').addEventListener('click', () => updateChart('C', 'C'));
          document.getElementById('chartNDVIBtn').addEventListener('click', () => updateChart('NDVI', 'NDVI'));
          document.getElementById('chartRUSLEBtn').addEventListener('click', () => updateChart('RUSLE', 'RUSLE'));
        },
      });
    }
    
    
    ///fin
}

// Example of how you might render the time series if the user requested it
// (Only needed if you implement monthly time series)




function populateDownloadLinks(links) {
  const container = document.getElementById('downloadLinks');
  container.innerHTML = ''; // Clear old links

  // links: {"R": "http://...", "C": "http://...", "NDVI": "http://..."}
  Object.keys(links).forEach(indexName => {
      const linkURL = links[indexName];
      const btn = document.createElement('button');
      btn.textContent = `Download ${indexName}`;
      btn.className = 'btn btn-info w-100';
      btn.style.marginBottom = '5px';
      btn.onclick = () => {
          window.open(linkURL, '_blank');
      };
      container.appendChild(btn);
  });
}



function refreshMap() {
  const iframe = document.getElementById('mapFrame');
  iframe.src = '/embaded_map?' + new Date().getTime(); // Append a timestamp to bypass cache
}
async function generateBassin() {
  const formData = new FormData(document.querySelector('#bassinForm'));

  try {
    const response = await fetch('/process_bassin', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    console.log('Full Response Data:', data);


    if (response.ok) {
      alert(data.message);
      // Show download link
      document.getElementById('downloadLink').style.display = 'block';
      document.getElementById('bassinDownload').href = data.download_link;
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while generating the GeoJSON.');
  }
}

async function usePredefined() {
    const selectedFile = document.getElementById('predefinedSelect').value;
    if (!selectedFile) {
      Swal.fire({
        title: 'Attention',
        text: 'Veuillez sélectionner un fichier GeoJSON à télécharger.',
        icon: 'warning',
        confirmButtonText: 'OK'
    });
            return;
    }
    
    try {
        const response = await fetch('/use_predefined', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: selectedFile }),
        });
        
        const data = await response.json();
        console.log('Full Response Data:', data);

        if (!response.ok) {
            alert(`Erreur: ${data.error}`);
        } else {
            alert(data.message);
            // Store the filename globally, so we can reuse it in `launchCalculation`
            uploadedFilename = selectedFile;
            console.log(`Using predefined file: ${selectedFile}`);
            refreshMap(); // Refresh the map to show the chosen geometry
        }
    } catch (error) {
        console.error('Fetch error:', error);
        alert('Une erreur est survenue lors de la sélection de la géométrie prédéfinie.');
    }
}

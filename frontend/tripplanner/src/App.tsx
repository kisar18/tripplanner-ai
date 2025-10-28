import React, { useEffect, useState } from 'react';
import './App.css';
import { Box } from '@mui/material';

interface Trip {
  id: number;
  city: string;
  days: number;
  itinerary: Record<string, string>;
}

function App() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [city, setCity] = useState('');
  const [days, setDays] = useState<number>(1);
  const [itinerary, setItinerary] = useState('');

  // Načtení existujících výletů
  const fetchTrips = () => {
    fetch('http://127.0.0.1:8000/trips')
      .then((res) => res.json())
      .then((data) => setTrips(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  // Odeslání nového výletu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // převod itineráře z textového vstupu do JSON objektu
    const itineraryObj = Object.fromEntries(
      itinerary.split(',').map((pair) => {
        const [key, value] = pair.split(':').map((s) => s.trim());
        return [key, value];
      })
    );

    try {
      const response = await fetch('http://127.0.0.1:8000/save_trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: city,
          days: days,
          itinerary: itineraryObj,
        }),
      });

      if (response.ok) {
        console.log('Trip saved!');
        setCity('');
        setDays(1);
        setItinerary('');
        fetchTrips();
      } else {
        console.error('Chyba při ukládání výletu:', await response.text());
      }
    } catch (error) {
      console.error('Network chyba:', error);
    }
  };

  return (
    <div className="App">
      <h1>Seznam výletů</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
        <div>
          <label>Město: </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            />
        </div>

        <div>
          <label>Počet dní: </label>
          <input
            type="number"
            min="1"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            required
            />
        </div>

        <div>
          <label>Itinerář (např. day1: ZOO, day2: Park): </label>
          <input
            type="text"
            value={itinerary}
            onChange={(e) => setItinerary(e.target.value)}
            required
            style={{ width: '400px' }}
            />
        </div>

        <button type="submit">Uložit výlet</button>
      </form>

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <table border={1} cellPadding={10}>
          <tr>
            <th>
              <strong>Město</strong>
            </th>
            <th>
              <strong>Počet dnů</strong>
            </th>
            <th>
              <strong>Itenerář</strong>
            </th>
          </tr>
          {trips.map((trip) => (
            <tr key={trip.id}>
              <td>{trip.city} </td>
              <td>{trip.days}</td>
              <td>
                <ul>
                  {Object.entries(trip.itinerary).map(([day, plan]) => (
                    <li key={day}>
                      {day}: {plan}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </table>
      </Box>
    </div>
  );
}

export default App;
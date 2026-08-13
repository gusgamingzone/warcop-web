import { useState, useEffect } from 'react';
import './App.css'; 
import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, arrayUnion, deleteDoc, setDoc, getDoc } from 'firebase/firestore';

function App() {
  const [pantalla, setPantalla] = useState('menu');
  
  // Estados para Registro de Clan
  const [nombreClan, setNombreClan] = useState('');
  const [insignia, setInsignia] = useState('');
  const [uniforme, setUniforme] = useState('');
  const [capitan, setCapitan] = useState('');
  const [codigoGenerado, setCodigoGenerado] = useState('');

  // Estados para Unirse a un Clan
  const [codigoIngresado, setCodigoIngresado] = useState('');
  const [idJugador, setIdJugador] = useState('');

  // Estados para Administración
  const [passwordAdmin, setPasswordAdmin] = useState('');
  const [clanesAdmin, setClanesAdmin] = useState([]);
  const ADMIN_SECRET = "LaMancoMeLaSuda"; 

  // Estados para Clanes Públicos y Transmisión Multiplataforma
  const [clanesPublicos, setClanesPublicos] = useState([]);
  const [streamUrl, setStreamUrl] = useState('');
  const [nuevaUrlStream, setNuevaUrlStream] = useState('');

  // Cargar enlace del stream al iniciar la app
  useEffect(() => {
    const cargarStream = async () => {
      try {
        const docSnap = await getDoc(doc(db, "configuracion", "stream"));
        if (docSnap.exists()) {
          setStreamUrl(docSnap.data().url);
          setNuevaUrlStream(docSnap.data().url);
        }
      } catch (error) {
        console.error("Error cargando configuración de transmisión", error);
      }
    };
    cargarStream();
  }, []);

  // Función inteligente para convertir links de YouTube, Twitch o Kick a Embed
  const obtenerEmbedUrl = (url) => {
    if (!url) return '';
    
    // Obtener el dominio actual para Twitch (requerido por sus políticas)
    const domain = window.location.hostname;

    // Lógica para TWITCH
    if (url.includes('twitch.tv/')) {
      if (url.includes('/videos/')) { // Es un video resubido (VOD)
        const videoId = url.split('/videos/')[1].split('?')[0];
        return `https://player.twitch.tv/?video=${videoId}&parent=${domain}&autoplay=true&muted=true`;
      } else { // Es un canal en vivo
        const channel = url.split('twitch.tv/')[1].split('/')[0].split('?')[0];
        return `https://player.twitch.tv/?channel=${channel}&parent=${domain}&autoplay=true&muted=true`;
      }
    }

    // Lógica para KICK
    if (url.includes('kick.com/')) {
      const channel = url.split('kick.com/')[1].split('/')[0].split('?')[0];
      return `https://player.kick.com/${channel}?autoplay=true&muted=true`;
    }

    // Lógica para YOUTUBE
    let videoId = '';
    if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
    else if (url.includes('watch?v=')) videoId = url.split('watch?v=')[1].split('&')[0];
    else if (url.includes('live/')) videoId = url.split('live/')[1].split('?')[0];
    else if (url.includes('embed/')) return url; 

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`;
    }
    
    // Si no es ninguna de las anteriores, devuelve la url tal cual
    return url; 
  };

  const registrarClan = async (e) => {
    e.preventDefault();
    try {
      const codigoUnico = 'WAR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await addDoc(collection(db, "clanes"), {
        nombreClan, insignia, uniforme, capitan,
        codigo: codigoUnico, jugadores: [capitan], suplentes: [],
        aprobado: false, puntos: 0, creadoEn: new Date()
      });
      setCodigoGenerado(codigoUnico);
      setPantalla('exito');
    } catch (error) {
      alert('Hubo un error al registrar el clan.');
    }
  };

  const unirseAlClan = async (e) => {
    e.preventDefault();
    try {
      const q = query(collection(db, "clanes"), where("codigo", "==", codigoIngresado.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return alert('❌ Código no encontrado.');

      const clanDoc = querySnapshot.docs[0];
      const clanData = clanDoc.data();
      if (!clanData.aprobado) return alert('⏳ Clan PENDIENTE de aprobación.');
      if (clanData.jugadores.length >= 20) return alert('⚠️ Cupos máximos alcanzados.');

      await updateDoc(doc(db, "clanes", clanDoc.id), { jugadores: arrayUnion(idJugador) });
      alert(`¡Te uniste a ${clanData.nombreClan}!`);
      setPantalla('menu');
    } catch (error) {
      alert('Error al unirse.');
    }
  };

  const cargarClanesPublicos = async () => {
    try {
      const q = query(collection(db, "clanes"), where("aprobado", "==", true));
      const querySnapshot = await getDocs(q);
      setClanesPublicos(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setPantalla('clanes-publicos');
    } catch (error) {}
  };

  const cargarPosiciones = async () => {
    try {
      const q = query(collection(db, "clanes"), where("aprobado", "==", true));
      const querySnapshot = await getDocs(q);
      const lista = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), puntos: doc.data().puntos || 0 }));
      lista.sort((a, b) => b.puntos - a.puntos);
      setClanesPublicos(lista);
      setPantalla('posiciones');
    } catch (error) {}
  };

  const cargarPanelAdmin = async (e) => {
    e.preventDefault();
    if (passwordAdmin === ADMIN_SECRET) {
      const querySnapshot = await getDocs(collection(db, "clanes"));
      setClanesAdmin(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), puntos: doc.data().puntos || 0 })));
      setPantalla('admin-panel');
      setPasswordAdmin('');
    } else {
      alert('❌ Contraseña incorrecta.');
    }
  };

  const toggleAprobacion = async (id, estadoActual) => {
    await updateDoc(doc(db, "clanes", id), { aprobado: !estadoActual });
    setClanesAdmin(clanesAdmin.map(c => c.id === id ? { ...c, aprobado: !estadoActual } : c));
  };

  const actualizarPuntos = async (id, puntosActuales, cantidad) => {
    const nuevosPuntos = (puntosActuales || 0) + cantidad;
    await updateDoc(doc(db, "clanes", id), { puntos: nuevosPuntos });
    setClanesAdmin(clanesAdmin.map(c => c.id === id ? { ...c, puntos: nuevosPuntos } : c));
  };

  const eliminarClanAdmin = async (id) => {
    if (window.confirm("¿Eliminar este clan permanentemente?")) {
      await deleteDoc(doc(db, "clanes", id));
      setClanesAdmin(clanesAdmin.filter(c => c.id !== id));
    }
  };

  const eliminarMiembro = async (clanId, jugadorAEliminar) => {
    if (window.confirm(`¿Expulsar a ${jugadorAEliminar}?`)) {
      const clanActual = clanesAdmin.find(c => c.id === clanId);
      const nuevosJugadores = clanActual.jugadores.filter(j => j !== jugadorAEliminar);
      await updateDoc(doc(db, "clanes", clanId), { jugadores: nuevosJugadores });
      setClanesAdmin(clanesAdmin.map(c => c.id === clanId ? { ...c, jugadores: nuevosJugadores } : c));
    }
  };

  const guardarStreamUrl = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "configuracion", "stream"), { url: nuevaUrlStream }, { merge: true });
      setStreamUrl(nuevaUrlStream);
      alert("✅ Enlace de transmisión actualizado con éxito.");
    } catch (error) {
      console.error(error);
      alert("Hubo un error al actualizar el enlace.");
    }
  };

  // --- VISTAS ---
  return (
    <div className="app-container">
      {pantalla === 'menu' && (
        <>
          {/* RECUADRO MULTIPLATAFORMA PRINCIPAL */}
          {streamUrl && (
            <div style={{ width: '100%', maxWidth: '800px', marginBottom: '30px', border: '1px solid #333', borderTop: '3px solid #aa0000', padding: '5px', background: 'rgba(15,15,15,0.8)', borderRadius: '4px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                <iframe
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  src={obtenerEmbedUrl(streamUrl)}
                  title="Transmisión en Vivo Zona de Comando"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}

          {/* LOGO SVG Y ENCABEZADO */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <img src="/logo.svg" alt="Zona de Comando Logo" style={{ width: '100%', maxWidth: '280px', filter: 'drop-shadow(0 0 10px rgba(255,0,0,0.3))' }} />
            <div style={{color:'#fff', fontSize:'1rem', letterSpacing:'5px', marginTop:'5px', fontWeight:'bold'}}>ORGANIZA</div>
          </div>
          
          <h1 className="title-main">GRAN DUELO</h1>
          <h2 className="title-sub">ENTRE CLANES</h2>
          <p style={{color:'#888', letterSpacing:'3px', marginBottom:'40px', textAlign: 'center'}}>COMPETENCIA CASUAL • DIVERSIÓN • ESTRATEGIA</p>
          
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn-tactico btn-oscuro" onClick={() => setPantalla('registro')}>Registrar Clan</button>
            <button className="btn-tactico btn-rojo" onClick={() => setPantalla('unirse')}>Unirse a un Clan</button>
            <button className="btn-tactico btn-oscuro" onClick={cargarClanesPublicos}>Ver Planillas</button>
            <button className="btn-tactico btn-dorado" onClick={cargarPosiciones}>🏆 Clasificación</button>
          </div>
        </>
      )}

      {pantalla === 'registro' && (
        <div style={{width: '100%', maxWidth: '400px'}}>
          <h2 style={{color:'#e60000', fontSize:'2rem', marginBottom:'20px', textAlign:'center'}}>REGISTRAR CLAN</h2>
          <form onSubmit={registrarClan} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input className="input-tactico" type="text" placeholder="Nombre del Clan" value={nombreClan} onChange={e => setNombreClan(e.target.value)} required />
            <input className="input-tactico" type="text" placeholder="Insignia (Ej: [ZDC])" value={insignia} onChange={e => setInsignia(e.target.value)} required />
            <input className="input-tactico" type="text" placeholder="Uniforme (Skin única)" value={uniforme} onChange={e => setUniforme(e.target.value)} required />
            <input className="input-tactico" type="text" placeholder="ID de Activision del Capitán" value={capitan} onChange={e => setCapitan(e.target.value)} required />
            <button className="btn-tactico btn-rojo" type="submit" style={{marginTop:'10px'}}>Enviar a Revisión</button>
            <button type="button" onClick={() => setPantalla('menu')} style={{background:'none', border:'none', color:'#888', cursor:'pointer', marginTop:'10px'}}>← VOLVER</button>
          </form>
        </div>
      )}

      {pantalla === 'exito' && (
        <div style={{textAlign:'center'}}>
          <h2 style={{color:'#ffd700', fontSize:'2.5rem'}}>¡REGISTRO ENVIADO!</h2>
          <p style={{color:'#aaa'}}>Código de acceso para tus jugadores:</p>
          <div style={{background:'#111', border:'2px dashed #aa0000', padding:'20px', fontSize:'2.5rem', color:'#e60000', margin:'20px 0', letterSpacing:'5px'}}>{codigoGenerado}</div>
          <button className="btn-tactico btn-rojo" onClick={() => setPantalla('menu')}>Volver al Inicio</button>
        </div>
      )}

      {pantalla === 'unirse' && (
        <div style={{width: '100%', maxWidth: '400px'}}>
          <h2 style={{color:'#e60000', fontSize:'2rem', marginBottom:'20px', textAlign:'center'}}>UNIRSE A CLAN</h2>
          <form onSubmit={unirseAlClan} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input className="input-tactico" type="text" placeholder="Código (Ej: WAR-XXXX)" value={codigoIngresado} onChange={e => setCodigoIngresado(e.target.value)} required style={{textAlign:'center', letterSpacing:'2px'}} />
            <input className="input-tactico" type="text" placeholder="Tu ID de Activision" value={idJugador} onChange={e => setIdJugador(e.target.value)} required />
            <button className="btn-tactico btn-rojo" type="submit" style={{marginTop:'10px'}}>Unirme Ahora</button>
            <button type="button" onClick={() => setPantalla('menu')} style={{background:'none', border:'none', color:'#888', cursor:'pointer', marginTop:'10px'}}>← VOLVER</button>
          </form>
        </div>
      )}

      {pantalla === 'clanes-publicos' && (
        <div style={{width: '100%', maxWidth: '700px'}}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'30px'}}>
            <h2 style={{color:'#e60000', fontSize:'2rem', margin:0}}>EQUIPOS APROBADOS</h2>
            <button className="btn-tactico btn-oscuro" onClick={() => setPantalla('menu')} style={{padding:'5px 15px', fontSize:'1rem'}}>Volver</button>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
            {clanesPublicos.map(clan => (
              <div key={clan.id} className="clan-card">
                <h3 className="clan-title">{clan.nombreClan} <span style={{color:'#e60000'}}>{clan.insignia}</span></h3>
                <p style={{color:'#aaa', margin:'0 0 15px 0'}}>Uniforme: {clan.uniforme}</p>
                <p style={{color:'#fff', fontWeight:'bold', marginBottom:'5px'}}>👑 Capitán: {clan.capitan}</p>
                
                <p style={{color:'#ccc', fontSize:'0.9rem', marginBottom:'2px'}}>⚔️ Titulares:</p>
                {clan.jugadores.slice(1,16).map((j, i) => <div key={i} style={{color:'#999', marginLeft:'20px', fontSize:'0.9rem'}}>• {j}</div>)}
                
                <p style={{color:'#aaa', fontSize:'0.9rem', marginTop:'10px', marginBottom:'2px'}}>🛡️ Suplentes:</p>
                {clan.jugadores.slice(16,20).map((j, i) => <div key={i} style={{color:'#777', marginLeft:'20px', fontSize:'0.9rem'}}>• {j}</div>)}
              </div>
            ))}
          </div>
        </div>
      )}

      {pantalla === 'posiciones' && (
        <div style={{width: '100%', maxWidth: '700px'}}>
           <div style={{display:'flex', justifyContent:'space-between', marginBottom:'30px'}}>
            <h2 style={{color:'#ffd700', fontSize:'2.5rem', margin:0, fontFamily:'Teko'}}>🏆 CLASIFICACIÓN</h2>
            <button className="btn-tactico btn-rojo" onClick={() => setPantalla('menu')} style={{padding:'5px 15px', fontSize:'1rem'}}>Volver</button>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
            {clanesPublicos.map((clan, index) => {
              const posClass = index === 0 ? 'pos-1' : index === 1 ? 'pos-2' : index === 2 ? 'pos-3' : '';
              return (
                <div key={clan.id} className={`posicion-card ${posClass}`}>
                  <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <span style={{fontSize:'1.5rem', fontWeight:'bold', color: index < 3 ? '#fff' : '#555'}}>{index + 1}</span>
                    <h3 style={{margin:0, fontSize:'1.6rem', fontFamily:'Teko'}}>{clan.nombreClan} <span style={{color:'#e60000'}}>{clan.insignia}</span></h3>
                  </div>
                  <div className="puntos-box">
                    <span className="puntos-num">{clan.puntos}</span>
                    <span style={{display:'block', fontSize:'0.7rem', color:'#e60000', fontWeight:'bold'}}>PTS</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pantalla === 'admin-login' && (
        <div style={{width: '100%', maxWidth: '350px'}}>
          <h2 style={{color:'#e60000', textAlign:'center', marginBottom:'20px'}}>SISTEMA ADMIN</h2>
          <form onSubmit={cargarPanelAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input className="input-tactico" type="password" placeholder="Contraseña Autorizada" value={passwordAdmin} onChange={e => setPasswordAdmin(e.target.value)} required style={{textAlign:'center'}} />
            <button className="btn-tactico btn-rojo" type="submit">Ingresar</button>
            <button type="button" onClick={() => setPantalla('menu')} style={{background:'none', border:'none', color:'#888', cursor:'pointer', marginTop:'10px'}}>← VOLVER</button>
          </form>
        </div>
      )}

      {pantalla === 'admin-panel' && (
        <div style={{width: '100%', maxWidth: '700px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px'}}>
            <h2 style={{color:'#e60000', fontSize:'2rem', margin:0}}>CONTROL ORGANIZACIÓN</h2>
            <button className="btn-tactico btn-oscuro" onClick={() => setPantalla('menu')} style={{padding:'5px 15px', fontSize:'1rem'}}>Cerrar Sesión</button>
          </div>
          
          {/* CONTROL STREAM ADMIN */}
          <div className="clan-card" style={{ borderTopColor: '#ffcc00', marginBottom: '30px' }}>
            <h3 className="clan-title">🎥 Transmisión / Video Principal</h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '10px' }}>Pega tu enlace de YouTube, Twitch o Kick para mostrarlo en el menú principal.</p>
            <form onSubmit={guardarStreamUrl} style={{ display: 'flex', gap: '10px' }}>
              <input 
                className="input-tactico" 
                type="text" 
                placeholder="Ej: https://www.twitch.tv/gusgamingzone" 
                value={nuevaUrlStream} 
                onChange={e => setNuevaUrlStream(e.target.value)} 
                style={{ flex: 1 }} 
              />
              <button className="btn-tactico btn-dorado" type="submit">Guardar</button>
            </form>
          </div>

          <h3 style={{color:'#888', borderBottom:'1px solid #333', paddingBottom:'10px'}}>GESTIÓN DE CLANES</h3>
          <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
            {clanesAdmin.map(clan => (
              <div key={clan.id} className="clan-card" style={{borderTopColor: clan.aprobado ? '#00aa00' : '#e60000'}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <h3 className="clan-title">{clan.nombreClan} <span style={{color:'#e60000'}}>{clan.insignia}</span></h3>
                  <span style={{background: clan.aprobado?'#003300':'#330000', color: clan.aprobado?'#00ff00':'#ff0000', padding:'5px 10px', fontSize:'0.8rem', fontWeight:'bold'}}>
                    {clan.aprobado ? 'APROBADO' : 'PENDIENTE'}
                  </span>
                </div>
                
                <p style={{color:'#aaa', margin:'5px 0'}}>Código: <span style={{color:'#fff'}}>{clan.codigo}</span></p>

                {clan.aprobado && (
                  <div style={{display:'flex', alignItems:'center', gap:'15px', margin:'15px 0', background:'#000', padding:'10px', border:'1px solid #333'}}>
                    <strong style={{color:'#ffd700'}}>PUNTOS:</strong>
                    <button onClick={() => actualizarPuntos(clan.id, clan.puntos, -1)} className="btn-tactico" style={{padding:'5px 15px', background:'#330000', color:'#ff0000'}}>-1</button>
                    <span style={{fontSize:'1.5rem', fontWeight:'bold', width:'40px', textAlign:'center'}}>{clan.puntos}</span>
                    <button onClick={() => actualizarPuntos(clan.id, clan.puntos, 1)} className="btn-tactico" style={{padding:'5px 15px', background:'#003300', color:'#00ff00'}}>+1</button>
                  </div>
                )}

                <div style={{background:'#0a0a0a', padding:'10px', marginTop:'15px', border:'1px solid #222'}}>
                  <p style={{margin:0, color:'#fff'}}>👑 Capitán: {clan.capitan}</p>
                  
                  <p style={{color:'#ccc', marginTop:'10px', marginBottom:'2px'}}>⚔️ Titulares:</p>
                  {clan.jugadores.slice(1,16).map(j => (
                    <div key={j} style={{display:'flex', justifyContent:'space-between', color:'#999', marginLeft:'15px'}}>
                      <span>• {j}</span>
                      <button onClick={() => eliminarMiembro(clan.id, j)} style={{background:'none', border:'none', color:'#ff3333', cursor:'pointer', fontWeight:'bold'}}>×</button>
                    </div>
                  ))}
                  
                  <p style={{color:'#aaa', marginTop:'10px', marginBottom:'2px'}}>🛡️ Suplentes:</p>
                  {clan.jugadores.slice(16,20).map(j => (
                    <div key={j} style={{display:'flex', justifyContent:'space-between', color:'#777', marginLeft:'15px'}}>
                      <span>• {j}</span>
                      <button onClick={() => eliminarMiembro(clan.id, j)} style={{background:'none', border:'none', color:'#ff3333', cursor:'pointer', fontWeight:'bold'}}>×</button>
                    </div>
                  ))}
                </div>

                <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                  <button className="btn-tactico" onClick={() => toggleAprobacion(clan.id, clan.aprobado)} style={{flex:1, background: clan.aprobado?'#550000':'#004400', borderLeftColor: clan.aprobado?'#ff0000':'#00ff00'}}>
                    {clan.aprobado ? 'Rechazar' : 'Aprobar Clan'}
                  </button>
                  <button className="btn-tactico" onClick={() => eliminarClanAdmin(clan.id)} style={{background:'#111', color:'#aa0000', borderLeftColor:'#550000'}}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER GLOBAL */}
      <footer className="app-footer">
        <p>
          &copy; {new Date().getFullYear()}{" "}
          <a href="https://www.tiktok.com/@gusgamingzone" target="_blank" rel="noopener noreferrer">
            GusGamingZone
          </a>
        </p>
        <p>
          Desarrollo por{" "}
          <a href="https://wa.me/50764749094" target="_blank" rel="noopener noreferrer">
            KunstonAgency
          </a>
        </p>
        <p style={{ marginTop: '15px' }}>
          <span className="admin-link" onClick={() => setPantalla('admin-login')}>
            Acceso Autorizado
          </span>
        </p>
      </footer>
    </div>
  );
}

export default App;

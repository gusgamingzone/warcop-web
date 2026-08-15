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

  // Estados para Configuración Dinámica de Eventos Futuros
  const [configEvento, setConfigEvento] = useState({
    tituloPrincipal: 'GRAN DUELO',
    tituloSecundario: 'ENTRE CLANES',
    maxTitulares: 15,
    maxSuplentes: 5
  });

  // Cargar enlaces y configuración al iniciar la app
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        const docSnap = await getDoc(doc(db, "configuracion", "stream"));
        if (docSnap.exists()) {
          setStreamUrl(docSnap.data().url);
          setNuevaUrlStream(docSnap.data().url);
        }

        const configSnap = await getDoc(doc(db, "configuracion", "evento"));
        if (configSnap.exists()) {
          setConfigEvento(configSnap.data());
        }
      } catch (error) {
        console.error("Error cargando configuración inicial", error);
      }
    };
    cargarDatosIniciales();
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
      
      const cupoTotalMaximo = 1 + configEvento.maxTitulares + configEvento.maxSuplentes;
      if (clanData.jugadores.length >= cupoTotalMaximo) return alert('⚠️ Cupos máximos alcanzados.');

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

  const guardarConfiguracionEvento = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "configuracion", "evento"), configEvento);
      alert("✅ Configuración del evento actualizada con éxito.");
    } catch (error) {
      console.error(error);
      alert("Hubo un error al guardar la configuración.");
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
          
          <h1 className="title-main">{configEvento.tituloPrincipal}</h1>
          <h2 className="title-sub">{configEvento.tituloSecundario}</h2>
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
            <h2 className="clan-title" style={{fontSize:'2.5rem', margin:0}}>EQUIPOS APROBADOS</h2>
            <button className="btn-tactico btn-oscuro" onClick={() => setPantalla('menu')} style={{padding:'5px 15px', fontSize:'1rem'}}>Volver</button>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
            {clanesPublicos.map(clan => (
              <div key={clan.id} className="clan-card">
                <h3 className="clan-title">{clan.nombreClan} <span style={{color:'#e60000'}}>{clan.insignia}</span></h3>
                <p style={{color:'#aaa', margin:'0 0 15px 0'}}>Uniforme: {clan.uniforme}</p>
                <p style={{color:'#fff', fontWeight:'bold', marginBottom:'5px'}}>👑 Capitán: {clan.capitan}</p>
                
                <p style={{color:'#ccc', fontSize:'0.9rem', marginBottom:'2px'}}>⚔️ Titulares:</p>
                {clan.jugadores.slice(1, 1 + configEvento.maxTitulares).map((j, i) => <div key={i} style={{color:'#999', marginLeft:'20px', fontSize:'0.9rem'}}>• {j}</div>)}
                
                <p style={{color:'#aaa', fontSize:'0.9rem', marginTop:'10px', marginBottom:'2px'}}>🛡️ Suplentes:</p>
                {clan.jugadores.slice(1 + configEvento.maxTitulares, 1 + configEvento.maxTitulares + configEvento.maxSuplentes).map((j, i) => <div key={i} style={{color:'#777', marginLeft:'20px', fontSize:'0.9rem'}}>• {j}</div>)}
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
            <h3 className="clan-title">CONTROL ORGANIZACIÓN</h3>
            <button className="btn-tactico btn-oscuro" onClick={() => setPantalla('menu')} style={{padding:'5px 15px', fontSize:'1rem'}}>Cerrar Sesión</button>
          </div>
          
          {/* CONFIGURACIÓN DE EVENTO (TÍTULOS Y CUPOS) */}
          <div className="clan-card" style={{ borderTopColor: '#ffd700', marginBottom: '20px' }}>
            <h3 className="clan-title">⚙️ Configuración del Evento</h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '10px' }}>Adapta los títulos y límites para futuros torneos.</p>
            <form onSubmit={guardarConfiguracionEvento} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{color: '#ccc', fontSize: '0.85rem'}}>Título Principal (Ej: GRAN DUELO):</label>
              <input className="input-tactico" type="text" value={configEvento.tituloPrincipal} onChange={e => setConfigEvento({...configEvento, tituloPrincipal: e.target.value})} required />
              
              <label style={{color: '#ccc', fontSize: '0.85rem'}}>Título Secundario (Ej: ENTRE CLANES):</label>
              <input className="input-tactico" type="text" value={configEvento.tituloSecundario} onChange={e => setConfigEvento({...configEvento, tituloSecundario: e.target.value})} required />
              
              <div style={{display: 'flex', gap: '10px', marginTop: '5px'}}>
                <div style={{flex: 1}}>
                  <label style={{color: '#ccc', fontSize: '0.85rem'}}>Máx. Titulares:</label>
                  <input className="input-tactico" type="number" value={configEvento.maxTitulares} onChange={e => setConfigEvento({...configEvento, maxTitulares: parseInt(e.target.value) || 0})} required />
                </div>
                <div style={{flex: 1}}>
                  <label style={{color: '#ccc', fontSize: '0.85rem'}}>Máx. Suplentes:</label>
                  <input className="input-tactico" type="number" value={configEvento.maxSuplentes} onChange={e => setConfigEvento({...configEvento, maxSuplentes: parseInt(e.target.value) || 0})} required />
                </div>
              </div>
              <button className="btn-tactico btn-dorado" type="submit" style={{marginTop: '10px'}}>Guardar Configuración</button>
            </form>
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
                  {clan.jugadores.slice(1, 1 + configEvento.maxTitulares).map(j => (
                    <div key={j} style={{display:'flex', justifyContent:'space-between', color:'#999', marginLeft:'15px'}}>
                      <span>• {j}</span>
                      <button onClick={() => eliminarMiembro(clan.id, j)} style={{background:'none', border:'none', color:'#ff3333', cursor:'pointer', fontWeight:'bold'}}>×</button>
                    </div>
                  ))}
                  
                  <p style={{color:'#aaa', marginTop:'10px', marginBottom:'2px'}}>🛡️ Suplentes:</p>
                  {clan.jugadores.slice(1 + configEvento.maxTitulares, 1 + configEvento.maxTitulares + configEvento.maxSuplentes).map(j => (
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

      {/* FOOTER GLOBAL ACTUALIZADO CON ICONOS SOCIALES ESTILO ATOM.BIO */}
      <footer className="app-footer">
        {/* TEXTO DE DERECHOS RESERVADOS */}
        <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#888' }}>
          &copy; {new Date().getFullYear()} La Zona de Comando. Todos los derechos reservados.
        </p>

        {/* FILA DE ICONOS SOCIALES INDEPENDIENTES */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '15px' }}>
          
          {/* DISCORD */}
          <a href="https://discord.com/invite/GEC8c5xRTc" target="_blank" rel="noopener noreferrer" style={{ color: '#888', transition: 'color 0.3s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#888'}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
            </svg>
          </a>

          {/* TWITCH */}
          <a href="https://www.twitch.tv/gusgamingzone" target="_blank" rel="noopener noreferrer" style={{ color: '#888', transition: 'color 0.3s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#888'}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
            </svg>
          </a>

          {/* KICK */}
          <a href="https://kick.com/gusgamingzone" target="_blank" rel="noopener noreferrer" style={{ color: '#888', transition: 'color 0.3s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#888'}>
             <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 2h5v8h2l5-8h5l-6 9 6 9h-5l-5-8h-2v8H4V2z"/>
            </svg>
          </a>

          {/* YOUTUBE */}
          <a href="https://www.youtube.com/@GusGamingZone" target="_blank" rel="noopener noreferrer" style={{ color: '#888', transition: 'color 0.3s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#888'}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>

          {/* TIKTOK */}
          <a href="https://www.tiktok.com/@gusgamingzone" target="_blank" rel="noopener noreferrer" style={{ color: '#888', transition: 'color 0.3s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#888'}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 15.68l.06.36a6.32 6.32 0 0 0 11.41 1.78l.1-.22v-6.52a8.27 8.27 0 0 0 4.43 1.25V8.86a4.87 4.87 0 0 1-1.41-.17z" />
            </svg>
          </a>
          
          {/* WHATSAPP */}
          <a href="https://chat.whatsapp.com/H1iy3kAMvGd7qjm84fyiGf" target="_blank" rel="noopener noreferrer" style={{ color: '#888', transition: 'color 0.3s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#888'}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.003 21.05h-.005c-1.603 0-3.17-.431-4.545-1.246l-.326-.193-3.376.885.905-3.29-.212-.337c-.896-1.428-1.369-3.09-1.369-4.795 0-4.945 4.025-8.97 8.97-8.97 2.397 0 4.65 .934 6.345 2.628 1.694 1.694 2.627 3.947 2.627 6.342 0 4.945-4.025 8.969-8.974 8.969zM12.003 2.023C6.49 2.023 2 6.514 2 12.026c0 1.761.463 3.483 1.341 5l-1.336 4.887 4.995-1.31A9.972 9.972 0 0 0 12.003 22c5.513 0 10.003-4.49 10.003-10.003 0-5.513-4.49-10.004-10.003-10.004z"/>
            </svg>
          </a>
        </div>

        {/* TEXTO DE DESARROLLO Y ACCESO ADMIN */}
        <p style={{ fontSize: '0.8rem', color: '#555', margin: '5px 0' }}>
          Desarrollo por{" "}
          <a href="https://wa.me/50764749094" target="_blank" rel="noopener noreferrer" style={{ color: '#555', textDecoration: 'none' }}>
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

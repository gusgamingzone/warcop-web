import { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, arrayUnion, deleteDoc } from 'firebase/firestore';

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
  const ADMIN_SECRET = "ZONAROJA2026"; 

  // Estados para Clanes Públicos
  const [clanesPublicos, setClanesPublicos] = useState([]);

  // 1. Registro de Clan (Pendiente por defecto)
  const registrarClan = async (e) => {
    e.preventDefault();
    try {
      const codigoUnico = 'WAR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      await addDoc(collection(db, "clanes"), {
        nombreClan,
        insignia,
        uniforme,
        capitan,
        codigo: codigoUnico,
        jugadores: [capitan], 
        suplentes: [],
        aprobado: false,
        creadoEn: new Date()
      });

      setCodigoGenerado(codigoUnico);
      setPantalla('exito');
    } catch (error) {
      console.error("Error al registrar el clan: ", error);
      alert('Hubo un error al registrar el clan en la base de datos.');
    }
  };

  // 2. Unirse a un Clan
  const unirseAlClan = async (e) => {
    e.preventDefault();
    try {
      const q = query(collection(db, "clanes"), where("codigo", "==", codigoIngresado.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert('❌ Código de clan no encontrado. Verifica con tu capitán.');
        return;
      }

      const clanDoc = querySnapshot.docs[0];
      const clanRef = doc(db, "clanes", clanDoc.id);
      const clanData = clanDoc.data();

      if (!clanData.aprobado) {
        alert('⏳ Este clan se encuentra registrado pero aún está PENDIENTE de aprobación por la organización.');
        return;
      }

      if (clanData.jugadores.length >= 20) {
        alert('⚠️ Este clan ya completó sus 20 cupos máximos.');
        return;
      }

      await updateDoc(clanRef, {
        jugadores: arrayUnion(idJugador)
      });

      alert(`¡Te has unido exitosamente al clan ${clanData.nombreClan}!`);
      setPantalla('menu');
    } catch (error) {
      console.error("Error al unirse al clan: ", error);
      alert('Hubo un error al procesar la solicitud.');
    }
  };

  // 3. Cargar clanes aprobados para la vista pública
  const cargarClanesPublicos = async () => {
    try {
      const q = query(collection(db, "clanes"), where("aprobado", "==", true));
      const querySnapshot = await getDocs(q);
      const lista = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClanesPublicos(lista);
      setPantalla('clanes-publicos');
    } catch (error) {
      console.error("Error al cargar clanes públicos:", error);
    }
  };

  // 4. Cargar clanes para el panel de administración
  const cargarPanelAdmin = async (e) => {
    e.preventDefault();
    if (passwordAdmin === ADMIN_SECRET) {
      try {
        const querySnapshot = await getDocs(collection(db, "clanes"));
        const lista = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClanesAdmin(lista);
        setPantalla('admin-panel');
        setPasswordAdmin('');
      } catch (error) {
        console.error("Error al cargar clanes:", error);
      }
    } else {
      alert('❌ Contraseña de administrador incorrecta.');
    }
  };

  // 5. Cambiar estado de aprobación
  const toggleAprobacion = async (id, estadoActual) => {
    try {
      const clanRef = doc(db, "clanes", id);
      await updateDoc(clanRef, { aprobado: !estadoActual });
      setClanesAdmin(clanesAdmin.map(c => c.id === id ? { ...c, aprobado: !estadoActual } : c));
    } catch (error) {
      console.error("Error al actualizar estado:", error);
    }
  };

  // 6. Eliminar clan
  const eliminarClanAdmin = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este clan permanentemente?")) {
      try {
        await deleteDoc(doc(db, "clanes", id));
        setClanesAdmin(clanesAdmin.filter(c => c.id !== id));
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  // 7. Eliminar miembro individual de un clan (Admin)
  const eliminarMiembro = async (clanId, jugadorAEliminar) => {
    if (window.confirm(`¿Seguro que deseas expulsar a ${jugadorAEliminar} del clan?`)) {
      try {
        const clanRef = doc(db, "clanes", clanId);
        const clanActual = clanesAdmin.find(c => c.id === clanId);
        const nuevosJugadores = clanActual.jugadores.filter(j => j !== jugadorAEliminar);
        
        await updateDoc(clanRef, { jugadores: nuevosJugadores });
        setClanesAdmin(clanesAdmin.map(c => c.id === clanId ? { ...c, jugadores: nuevosJugadores } : c));
      } catch (error) {
        console.error("Error al eliminar miembro:", error);
      }
    }
  };

  // --- VISTA 1: MENÚ PRINCIPAL ---
  if (pantalla === 'menu') {
    return (
      <div style={{ backgroundColor: '#050505', backgroundImage: 'radial-gradient(circle at 50% 0%, #4a0000 0%, #050505 60%)', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', margin: 0, padding: '20px', position: 'relative' }}>
        
        <button onClick={() => setPantalla('admin-login')} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: '1px solid #444', color: '#888', padding: '8px 15px', cursor: 'pointer', fontSize: '0.8rem', textTransform: 'uppercase' }}>
          🛡️ Admin
        </button>

        <div style={{ color: '#ff0000', fontSize: '1.2rem', letterSpacing: '3px', fontWeight: 'bold', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🎮</span> ZONA DE COMANDO <span style={{ color: '#ffffff', fontSize: '0.9rem'}}>ORGANIZA</span>
        </div>
        
        <h1 style={{ color: '#ffffff', fontSize: '5rem', textAlign: 'center', textTransform: 'uppercase', margin: '0', fontWeight: '900', lineHeight: '0.9', letterSpacing: '2px' }}>
          GRAN DUELO
        </h1>
        <h2 style={{ color: '#ff0000', fontSize: '3.5rem', textAlign: 'center', textTransform: 'uppercase', margin: '5px 0 20px 0', fontWeight: '900', letterSpacing: '2px', textShadow: '0 0 15px rgba(255,0,0,0.6)' }}>
          ENTRE CLANES
        </h2>
        <p style={{ color: '#a3a3a3', fontSize: '1rem', letterSpacing: '4px', marginBottom: '40px', textTransform: 'uppercase', textAlign: 'center' }}>
          Competencia Casual • Diversión • Estrategia • Respeto
        </p>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => setPantalla('registro')} style={{ backgroundColor: '#000000', color: '#ffffff', border: '2px solid #ff0000', padding: '15px 30px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', boxShadow: 'inset 0 0 15px rgba(255,0,0,0.3), 0 0 20px rgba(255,0,0,0.4)' }}>
            Registrar Clan
          </button>
          
          <button onClick={() => setPantalla('unirse')} style={{ backgroundColor: '#ff0000', color: '#ffffff', border: '2px solid #ff0000', padding: '15px 30px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', boxShadow: '0 0 20px rgba(255,0,0,0.6)' }}>
            Unirse a un Clan
          </button>

          <button onClick={cargarClanesPublicos} style={{ backgroundColor: 'transparent', color: '#ff0000', border: '2px solid #ff0000', padding: '15px 30px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Ver Clanes Inscritos
          </button>
        </div>
      </div>
    );
  }

  // --- VISTA 2: FORMULARIO DE REGISTRO ---
  if (pantalla === 'registro') {
    return (
      <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
        <h2 style={{ color: '#ff0000', textTransform: 'uppercase', fontSize: '2rem', marginBottom: '10px' }}>Registrar Nuevo Clan</h2>
        
        <form onSubmit={registrarClan} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '320px' }}>
          <input type="text" placeholder="Nombre del Clan" value={nombreClan} onChange={(e) => setNombreClan(e.target.value)} required style={{ padding: '12px', backgroundColor: '#1a1a1a', color: 'white', border: '1px solid #ff0000', outline: 'none' }} />
          <input type="text" placeholder="Insignia (Ej: [ZDC])" value={insignia} onChange={(e) => setInsignia(e.target.value)} required style={{ padding: '12px', backgroundColor: '#1a1a1a', color: 'white', border: '1px solid #ff0000', outline: 'none' }} />
          <input type="text" placeholder="Uniforme (Skin única)" value={uniforme} onChange={(e) => setUniforme(e.target.value)} required style={{ padding: '12px', backgroundColor: '#1a1a1a', color: 'white', border: '1px solid #ff0000', outline: 'none' }} />
          <input type="text" placeholder="ID de Activision del Capitán" value={capitan} onChange={(e) => setCapitan(e.target.value)} required style={{ padding: '12px', backgroundColor: '#1a1a1a', color: 'white', border: '1px solid #ff0000', outline: 'none' }} />
          
          <button type="submit" style={{ backgroundColor: '#ff0000', color: 'white', padding: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px', textTransform: 'uppercase' }}>
            Enviar Registro a Revisión
          </button>
          
          <button type="button" onClick={() => setPantalla('menu')} style={{ backgroundColor: 'transparent', color: '#a3a3a3', border: 'none', cursor: 'pointer', marginTop: '10px' }}>
            ← Volver al inicio
          </button>
        </form>
      </div>
    );
  }

  // --- VISTA 3: PANTALLA DE ÉXITO ---
  if (pantalla === 'exito') {
    return (
      <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', textAlign: 'center', padding: '20px' }}>
        <h2 style={{ color: '#ffcc00', fontSize: '2.2rem', marginBottom: '10px' }}>¡REGISTRO ENVIADO!</h2>
        <p style={{ fontSize: '1.1rem', color: '#ccc', maxWidth: '400px' }}>Tu clan está pendiente de aprobación por los administradores. Guarda tu código de acceso:</p>
        
        <div style={{ backgroundColor: '#1a1a1a', border: '2px dashed #ff0000', padding: '20px 40px', fontSize: '2.2rem', letterSpacing: '4px', margin: '25px 0', color: '#ff0000', fontWeight: 'bold' }}>
          {codigoGenerado}
        </div>

        <button onClick={() => setPantalla('menu')} style={{ backgroundColor: '#ff0000', color: 'white', padding: '12px 30px', border: 'none', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Volver al Inicio
        </button>
      </div>
    );
  }

  // --- VISTA 4: UNIRSE A UN CLAN ---
  if (pantalla === 'unirse') {
    return (
      <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
        <h2 style={{ color: '#ff0000', textTransform: 'uppercase', fontSize: '2rem', marginBottom: '10px' }}>Unirse a un Clan</h2>
        <p style={{ color: '#a3a3a3', marginBottom: '20px' }}>Ingresa el código que te dio tu capitán.</p>
        
        <form onSubmit={unirseAlClan} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '320px' }}>
          <input type="text" placeholder="Código (Ej: WAR-XXXX)" value={codigoIngresado} onChange={(e) => setCodigoIngresado(e.target.value)} required style={{ padding: '12px', backgroundColor: '#1a1a1a', color: 'white', border: '1px solid #ff0000', outline: 'none', textAlign: 'center', letterSpacing: '2px', textTransform: 'uppercase' }} />
          <input type="text" placeholder="Tu ID de Activision" value={idJugador} onChange={(e) => setIdJugador(e.target.value)} required style={{ padding: '12px', backgroundColor: '#1a1a1a', color: 'white', border: '1px solid #ff0000', outline: 'none' }} />
          
          <button type="submit" style={{ backgroundColor: '#ff0000', color: 'white', padding: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px', textTransform: 'uppercase' }}>
            Unirme al Clan
          </button>
          
          <button type="button" onClick={() => setPantalla('menu')} style={{ backgroundColor: 'transparent', color: '#a3a3a3', border: 'none', cursor: 'pointer', marginTop: '10px' }}>
            ← Volver al inicio
          </button>
        </form>
      </div>
    );
  }

  // --- VISTA 5: CLANES INSCRITOS (PÚBLICO) ---
  if (pantalla === 'clanes-publicos') {
    return (
      <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: 'white', fontFamily: 'Arial, sans-serif', padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
          <div>
            <h2 style={{ color: '#ff0000', margin: 0, textTransform: 'uppercase' }}>Equipos Participantes</h2>
            <p style={{ color: '#888', margin: '5px 0 0 0' }}>Clanes oficiales aprobados para el Duelo</p>
          </div>
          <button onClick={() => setPantalla('menu')} style={{ backgroundColor: '#ff0000', color: 'white', border: 'none', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase' }}>
            ← Volver
          </button>
        </div>

        {clanesPublicos.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888', marginTop: '50px' }}>No hay clanes aprobados en este momento.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px', margin: '0 auto' }}>
            {clanesPublicos.map((clan) => (
              <div key={clan.id} style={{ backgroundColor: '#111', border: '2px solid #ff0000', padding: '20px', borderRadius: '4px', boxShadow: '0 0 10px rgba(255,0,0,0.2)' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem' }}>{clan.nombreClan} <span style={{ color: '#ff0000' }}>{clan.insignia}</span></h3>
                <p style={{ margin: '5px 0', color: '#ccc', fontSize: '0.9rem' }}><strong>Uniforme:</strong> {clan.uniforme}</p>
                
                <div style={{ marginTop: '15px', borderTop: '1px solid #333', paddingTop: '10px' }}>
                  <p style={{ margin: '0 0 5px 0', color: '#ff0000', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Plantilla ({clan.jugadores.length}/20):</p>
                  
                  <p style={{ margin: '4px 0', color: '#fff', fontSize: '0.9rem' }}>👑 <strong>Capitán:</strong> {clan.capitan}</p>
                  
                  <p style={{ margin: '6px 0 2px 0', color: '#ccc', fontSize: '0.9rem' }}>⚔️ <strong>Titulares:</strong></p>
                  {clan.jugadores.slice(1, 16).length === 0 ? (
                    <p style={{ margin: '2px 0 2px 15px', color: '#888', fontSize: '0.85rem' }}>Ninguno</p>
                  ) : (
                    clan.jugadores.slice(1, 16).map((jugador, idx) => (
                      <p key={idx} style={{ margin: '2px 0 2px 15px', color: '#ccc', fontSize: '0.85rem' }}>• {jugador}</p>
                    ))
                  )}
                  
                  <p style={{ margin: '8px 0 2px 0', color: '#aaa', fontSize: '0.9rem' }}>🛡️ <strong>Suplentes:</strong></p>
                  {clan.jugadores.slice(16, 20).length === 0 ? (
                    <p style={{ margin: '2px 0 2px 15px', color: '#888', fontSize: '0.85rem' }}>Ninguno</p>
                  ) : (
                    clan.jugadores.slice(16, 20).map((jugador, idx) => (
                      <p key={idx} style={{ margin: '2px 0 2px 15px', color: '#aaa', fontSize: '0.85rem' }}>• {jugador}</p>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- VISTA 6: LOGIN DE ADMINISTRADOR ---
  if (pantalla === 'admin-login') {
    return (
      <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
        <h2 style={{ color: '#ff0000', textTransform: 'uppercase', fontSize: '1.8rem', marginBottom: '10px' }}>Acceso Restringido</h2>
        <p style={{ color: '#888', marginBottom: '20px' }}>Solo personal autorizado de la organización.</p>
        
        <form onSubmit={cargarPanelAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '300px' }}>
          <input type="password" placeholder="Contraseña de Administrador" value={passwordAdmin} onChange={(e) => setPasswordAdmin(e.target.value)} required style={{ padding: '12px', backgroundColor: '#1a1a1a', color: 'white', border: '1px solid #ff0000', outline: 'none', textAlign: 'center' }} />
          
          <button type="submit" style={{ backgroundColor: '#ff0000', color: 'white', padding: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Ingresar al Panel
          </button>
          
          <button type="button" onClick={() => setPantalla('menu')} style={{ backgroundColor: 'transparent', color: '#a3a3a3', border: 'none', cursor: 'pointer', marginTop: '10px' }}>
            ← Volver al inicio
          </button>
        </form>
      </div>
    );
  }

  // --- VISTA 7: PANEL DE ADMINISTRACIÓN ---
  if (pantalla === 'admin-panel') {
    return (
      <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: 'white', fontFamily: 'Arial, sans-serif', padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
          <div>
            <h2 style={{ color: '#ff0000', margin: 0, textTransform: 'uppercase' }}>Panel de Control • Organización</h2>
            <p style={{ color: '#888', margin: '5px 0 0 0' }}>Gestión y aprobación de clanes inscritos</p>
          </div>
          <button onClick={() => setPantalla('menu')} style={{ backgroundColor: '#222', color: 'white', border: '1px solid #444', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}>
            Cerrar Sesión Admin
          </button>
        </div>

        {clanesAdmin.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888', marginTop: '50px' }}>No hay clanes registrados en el sistema todavía.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px', margin: '0 auto' }}>
            {clanesAdmin.map((clan) => (
              <div key={clan.id} style={{ backgroundColor: '#111', border: `2px solid ${clan.aprobado ? '#00ff00' : '#ff0000'}`, padding: '20px', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{clan.nombreClan} <span style={{ color: '#ff0000' }}>{clan.insignia}</span></h3>
                  <span style={{ fontSize: '0.75rem', padding: '3px 8px', backgroundColor: clan.aprobado ? '#003300' : '#330000', color: clan.aprobado ? '#00ff00' : '#ff0000', fontWeight: 'bold', border: `1px solid ${clan.aprobado ? '#00ff00' : '#ff0000'}` }}>
                    {clan.aprobado ? 'APROBADO' : 'PENDIENTE'}
                  </span>
                </div>

                <p style={{ margin: '5px 0', color: '#ccc', fontSize: '0.9rem' }}><strong>Uniforme:</strong> {clan.uniforme}</p>
                <p style={{ margin: '5px 0', color: '#ccc', fontSize: '0.9rem' }}><strong>Código:</strong> <span style={{ color: '#ff0000', fontFamily: 'monospace' }}>{clan.codigo}</span></p>
                
                <div style={{ margin: '10px 0 15px 0', padding: '8px', backgroundColor: '#1a1a1a', border: '1px solid #333', fontSize: '0.85rem' }}>
                  <p style={{ margin: '2px 0', color: '#fff' }}>👑 <strong>Capitán:</strong> {clan.capitan}</p>
                  
                  <p style={{ margin: '6px 0 2px 0', color: '#ccc' }}>⚔️ <strong>Titulares:</strong></p>
                  {clan.jugadores.slice(1, 16).length === 0 ? (
                    <p style={{ margin: '2px 0 2px 15px', color: '#888' }}>Ninguno</p>
                  ) : (
                    clan.jugadores.slice(1, 16).map((jugador, idx) => (
                      <div key={idx} style={{ margin: '2px 0 2px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ccc' }}>
                        <span>• {jugador}</span>
                        <button onClick={() => eliminarMiembro(clan.id, jugador)} style={{ background: 'transparent', border: 'none', color: '#ff5555', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', padding: '0 5px' }} title="Eliminar miembro">×</button>
                      </div>
                    ))
                  )}

                  <p style={{ margin: '8px 0 2px 0', color: '#aaa' }}>🛡️ <strong>Suplentes:</strong></p>
                  {clan.jugadores.slice(16, 20).length === 0 ? (
                    <p style={{ margin: '2px 0 2px 15px', color: '#888' }}>Ninguno</p>
                  ) : (
                    clan.jugadores.slice(16, 20).map((jugador, idx) => (
                      <div key={idx} style={{ margin: '2px 0 2px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#aaa' }}>
                        <span>• {jugador}</span>
                        <button onClick={() => eliminarMiembro(clan.id, jugador)} style={{ background: 'transparent', border: 'none', color: '#ff5555', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', padding: '0 5px' }} title="Eliminar miembro">×</button>
                      </div>
                    ))
                  )}

                  <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#888', textAlign: 'right' }}>Total: {clan.jugadores.length}/20</p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => toggleAprobacion(clan.id, clan.aprobado)} style={{ flex: 1, backgroundColor: clan.aprobado ? '#aa0000' : '#00aa00', color: 'white', border: 'none', padding: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {clan.aprobado ? 'Rechazar' : 'Aprobar Clan'}
                  </button>
                  <button onClick={() => eliminarClanAdmin(clan.id)} style={{ backgroundColor: '#222', color: '#ff5555', border: '1px solid #ff5555', padding: '8px 12px', cursor: 'pointer' }}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
}

export default App;
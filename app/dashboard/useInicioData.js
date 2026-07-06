'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAutoRefresh } from '../../components/useAutoRefresh';

// Data-fetching de la pantalla de Inicio, compartido entre InicioMobile e
// InicioDesktop: mismos 7 endpoints, mismo estado, un solo montaje por
// variante activa (nunca ambas a la vez, ver app/dashboard/page.js).
export function useInicioData() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [notas, setNotas] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [calendario, setCalendario] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [balanceData, setBalanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargarDatos = useCallback(() => {
    Promise.all([
      fetch('/api/dashboard/gastos').then((r) => r.json()),
      fetch('/api/dashboard/resumen').then((r) => r.json()),
      fetch('/api/dashboard/ideas').then((r) => r.json()),
      fetch('/api/dashboard/notas').then((r) => r.json()),
      fetch('/api/dashboard/tareas').then((r) => r.json()),
      fetch('/api/dashboard/calendario').then((r) => r.json()),
      fetch('/api/dashboard/balance').then((r) => r.json()),
    ])
      .then(([gastosData, resumenData, ideasData, notasData, tareasData, calendarioData, balData]) => {
        if (resumenData.error === 'No autorizado') {
          router.push('/login');
          return;
        }
        setData(gastosData);
        setUsuario(resumenData.usuario);
        setResumen(resumenData.resumen);
        setIdeas(ideasData.ideas || []);
        setNotas(notasData.notas || []);
        setTareas(tareasData.tareas || []);
        setCalendario(calendarioData.eventos || []);
        setBalanceData(balData || null);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useAutoRefresh(cargarDatos);

  return { data, ideas, notas, tareas, calendario, usuario, resumen, balanceData, loading, setUsuario };
}

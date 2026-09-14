  async function fetchUsuarios() {
    setLoading(true);
    // Mostra cache instantâneo se tiver
    const cached = localStorage.getItem('argus_permissoes_cache');
    if (cached) {
      try { setUsuarios(JSON.parse(cached)); setLoading(false); } catch {}
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      
      const { data, error: err } = await supabase
        .from('permissoes_usuarios')
        .select('id,email,role,created_at,updated_at')
        .order('created_at', { ascending: false })
        .limit(100)
        .abortSignal(controller.signal);

      clearTimeout(timer);
      if (err) throw err;
      
      setUsuarios(data || []);
      localStorage.setItem('argus_permissoes_cache', JSON.stringify(data || []));
      setError(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        setError('Banco lento - mostrando cache local. Clique em atualizar.');
      }
    } finally {
      setLoading(false);
    }
  }

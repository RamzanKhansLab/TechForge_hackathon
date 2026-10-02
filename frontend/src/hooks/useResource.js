import { useEffect, useRef, useState } from 'react';
export function useResource(key,loader,poll = false) {
  const loaderRef = useRef(loader); loaderRef.current = loader;
  const [attempt,setAttempt] = useState(0);
  const [state,setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController(); let timer;
    setState({ data: null, loading: true, error: null });
    async function fetchResource() {
      try {
        const data = await loaderRef.current(controller.signal);
        if (controller.signal.aborted) return;
        setState({ data,loading: false,error: null });
        if (poll && ['queued','processing'].includes(data.status)) timer = setTimeout(fetchResource,2500);
      } catch (error) { if (!controller.signal.aborted) setState(previous => ({ ...previous,loading: false,error })); }
    }
    void fetchResource();
    return () => { controller.abort(); clearTimeout(timer); };
  },[key,attempt,poll]);
  return { ...state,reload: () => setAttempt(value => value+1), setData: data => setState({ data,loading: false,error: null }) };
}

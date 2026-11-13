import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { SLOTS, slotLabel, todayLocal, formatDate } from '../constants';

const PAGE_SIZE = 10;
const emptyForm = () => ({ date: todayLocal(), slot: SLOTS[0].value, value: '' });

export default function ReadingsPage() {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [list, setList] = useState({ data: [], page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setList(await api(`/readings?page=${page}&limit=${PAGE_SIZE}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const body = {
      date: form.date,
      slot: form.slot,
      value: form.value === '' ? undefined : Number(form.value),
    };
    try {
      if (editingId) await api(`/readings/${editingId}`, { method: 'PUT', body });
      else await api('/readings', { method: 'POST', body });
      setEditingId(null);
      setForm({ ...emptyForm(), date: form.date }); // keep the date: users often log several slots in a row
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(r) {
    setEditingId(r.id);
    setForm({ date: r.date, slot: r.slot, value: String(r.value) });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setError('');
  }

  async function onDelete(r) {
    if (!window.confirm(`Delete the ${slotLabel(r.slot)} reading on ${formatDate(r.date)}?`)) return;
    try {
      await api(`/readings/${r.id}`, { method: 'DELETE' });
      if (list.data.length === 1 && page > 1) setPage(page - 1); // last item on the page
      else await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <form className="card" onSubmit={onSubmit} noValidate>
        <h2>{editingId ? 'Edit reading' : 'Add a reading'}</h2>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="row">
          <label>Date<input type="date" value={form.date} max={todayLocal()} onChange={set('date')} /></label>
          <label>
            Time slot
            <select value={form.slot} onChange={set('slot')}>
              {SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label>
            Glucose (mg/dl)
            <input type="number" inputMode="numeric" value={form.value} onChange={set('value')} placeholder="e.g. 120" />
          </label>
        </div>
        <div className="actions">
          <button className="primary">{editingId ? 'Save changes' : 'Add reading'}</button>
          {editingId && <button type="button" onClick={cancelEdit}>Cancel</button>}
        </div>
      </form>

      <section className="card">
        <h2>Your readings</h2>
        {loading ? <p className="muted">Loading…</p> : list.data.length === 0 ? (
          <p className="empty">No readings yet. Add your first one above.</p>
        ) : (
          <>
            <table>
              <thead><tr><th>Date</th><th>Slot</th><th>Value</th><th /></tr></thead>
              <tbody>
                {list.data.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.date)}</td>
                    <td>{slotLabel(r.slot)}</td>
                    <td><strong>{r.value}</strong> mg/dl</td>
                    <td className="right">
                      <button className="link" onClick={() => startEdit(r)}>Edit</button>
                      <button className="link danger" onClick={() => onDelete(r)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pager">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
              <span>Page {list.page} of {list.totalPages} ({list.total} readings)</span>
              <button disabled={page >= list.totalPages} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
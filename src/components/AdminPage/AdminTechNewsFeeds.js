import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAdminCommonCopy, useAdminPageCopy } from "../../hooks/useAdminCopy";
import { APP_LOCALES } from "../../i18n/locales";
import { interpolate } from "../../i18n/translate";
import {
  createTechNewsFeed,
  deleteTechNewsFeed,
  fetchTechNewsFeeds,
  fetchTechNewsFeedsMeta,
  resetTechNewsFeeds,
  updateTechNewsFeed,
} from "../../api/techNewsFeeds";
import TechNewsFeedFormModal from "./TechNewsFeedFormModal";
import {
  buildDefaultTechNewsFeedDraft,
  buildTechNewsFeedDraftFromFeed,
} from "./techNewsFeedConstants";
import {
  Badge,
  Btn,
  BtnIcon,
  Card,
  ConfirmModal,
  Page,
  SubTabs,
  Switch,
  Table,
  Toolbar,
} from "./AdminUi";
import adminUi from "./AdminUi.module.css";

const EMPTY_FORM = buildDefaultTechNewsFeedDraft();

export default function AdminTechNewsFeeds() {
  const copy = useAdminPageCopy("techNewsFeeds");
  const adminCopy = useAdminCommonCopy();
  const [feedLocale, setFeedLocale] = useState("fr");
  const [feeds, setFeeds] = useState([]);
  const [meta, setMeta] = useState({ categories: [], categoryLabels: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const localeTabs = useMemo(
    () =>
      APP_LOCALES.map((loc) => ({
        key: loc.code,
        label: `${loc.flag} ${loc.label}`,
      })),
    []
  );

  const categoryLabel = (key) => meta.categoryLabels?.[key] || key;

  const loadFeeds = useCallback(async (loc) => {
    setLoading(true);
    try {
      const data = await fetchTechNewsFeeds(loc);
      setFeeds(data.feeds || []);
    } catch (err) {
      toast.error(err.message || copy.loadError);
      setFeeds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTechNewsFeedsMeta()
      .then(setMeta)
      .catch(() => {
        /* defaults used */
      });
  }, []);

  useEffect(() => {
    loadFeeds(feedLocale);
  }, [feedLocale, loadFeeds]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (feed) => {
    setEditing(feed);
    setForm(buildTechNewsFeedDraftFromFeed(feed));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const saveFeed = async () => {
    setSaving(true);
    try {
      const payload = {
        locale: feedLocale,
        source: form.source.trim(),
        url: form.url.trim(),
        category: form.category,
        enabled: form.enabled,
      };
      if (form.sortOrder !== "") {
        payload.sortOrder = Number(form.sortOrder);
      }

      if (editing) {
        const { feed } = await updateTechNewsFeed(editing.id, payload);
        setFeeds((prev) => prev.map((f) => (f.id === feed.id ? feed : f)));
        toast.success(copy.updated);
      } else {
        const { feed } = await createTechNewsFeed(payload);
        setFeeds((prev) => [...prev, feed].sort((a, b) => a.sortOrder - b.sortOrder));
        toast.success(copy.added);
      }
      closeModal();
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (feed, enabled) => {
    try {
      const { feed: updated } = await updateTechNewsFeed(feed.id, { enabled });
      setFeeds((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    } catch (err) {
      toast.error(err.message || copy.toggleError);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await deleteTechNewsFeed(confirmDelete.id);
      setFeeds((prev) => prev.filter((f) => f.id !== confirmDelete.id));
      toast.success(copy.deleted);
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err.message || copy.deleteError);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const data = await resetTechNewsFeeds(feedLocale);
      setFeeds(data.feeds || []);
      toast.success(copy.resetSuccess);
      setConfirmReset(false);
    } catch (err) {
      toast.error(err.message || copy.resetError);
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => [
    {
      key: "enabled",
      label: adminCopy.activeColumn,
      width: "72px",
      render: (row) => (
        <Switch checked={row.enabled} onChange={(on) => toggleEnabled(row, on)} />
      ),
    },
    {
      key: "source",
      label: adminCopy.source,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.source}</div>
          <div className={adminUi.tableSubtext}>{row.url}</div>
        </div>
      ),
    },
    {
      key: "category",
      label: adminCopy.category,
      width: "120px",
      render: (row) => <Badge variant="muted">{categoryLabel(row.category)}</Badge>,
    },
    {
      key: "sortOrder",
      label: adminCopy.order,
      width: "72px",
      render: (row) => row.sortOrder,
    },
    {
      key: "actions",
      label: "",
      width: "88px",
      render: (row) => (
        <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
          <BtnIcon icon="mdi:pencil-outline" title={adminCopy.edit} onClick={() => openEdit(row)} />
          <BtnIcon
            icon="mdi:trash-can-outline"
            title={adminCopy.delete}
            variant="danger"
            onClick={() => setConfirmDelete(row)}
          />
        </div>
      ),
    },
  ], [adminCopy, copy, toggleEnabled, openEdit]);

  const activeLocale = APP_LOCALES.find((l) => l.code === feedLocale);

  return (
    <Page>
      <SubTabs items={localeTabs} active={feedLocale} onChange={setFeedLocale} />

      <Card
        title={copy.title}
        description={interpolate(copy.description, { locale: activeLocale?.label || feedLocale })}
        fill
        action={
          <Btn icon="mdi:plus" onClick={openCreate}>
            {copy.addFeed}
          </Btn>
        }
      >
        <Toolbar
          meta={interpolate(copy.meta, {
            total: feeds.length,
            active: feeds.filter((f) => f.enabled).length,
          })}
          action={
            <Btn variant="secondary" size="sm" icon="mdi:restore" onClick={() => setConfirmReset(true)}>
              {adminCopy.reset}
            </Btn>
          }
        />

        {loading ? (
          <p className={adminUi.adminMutedText}>{copy.loading}</p>
        ) : (
          <Table
            columns={columns}
            rows={feeds}
            emptyMessage={copy.empty}
          />
        )}
      </Card>

      <TechNewsFeedFormModal
        open={modalOpen}
        mode={editing ? "edit" : "create"}
        draft={form}
        setDraft={setForm}
        saving={saving}
        categoryOptions={meta.categories}
        categoryLabel={categoryLabel}
        onClose={closeModal}
        onSave={saveFeed}
      />

      <ConfirmModal
        open={confirmReset}
        onClose={() => !saving && setConfirmReset(false)}
        onConfirm={handleReset}
        title={copy.resetTitle}
        message={interpolate(copy.resetMessage, { locale: activeLocale?.label || feedLocale })}
        confirmLabel={adminCopy.reset}
        icon="mdi:restore"
        confirmVariant="primary"
      />

      <ConfirmModal
        open={Boolean(confirmDelete)}
        onClose={() => !saving && setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={copy.deleteTitle}
        message={interpolate(copy.deleteMessage, { source: confirmDelete?.source || "" })}
        confirmLabel={adminCopy.delete}
      />
    </Page>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildWorkshopCatalog, keywordOnlyRules, workshopRule, workshopSelectionForList, type WorkshopCard, type WorkshopKind } from '../lib/cardWorkshop';
import { readPersonalCards, savePersonalCard, deletePersonalCard, validateWorkshopImage } from '../lib/cardWorkshopStorage';
import { prepareWorkshopCalibration, prepareWorkshopPrint, type WorkshopPrintFormat, type WorkshopPrintResult, WORKSHOP_FORMAT_LABELS } from '../lib/cardWorkshopPrint';
import { importArmyList } from '../lib/importList';
import { normalizeName } from '../lib/normalize';
import { usePersistentState } from '../lib/storage';
import type { CardTagLibrary, KeywordDef, ParsedList } from '../types';
import { workshopRulesForMode, type WorkshopTextMode } from '../lib/cardWorkshopText';
import { DefinitionText } from '../lib/diceIcons';
import referenceTopics from '../data/workshopReferenceTopics.json';
import './card-workshop.css';

interface Props { tagLibrary: CardTagLibrary; keywords: KeywordDef[]; listP1?: ParsedList | null; listP2?: ParsedList | null }
const KINDS: Record<WorkshopKind, string> = { unit: 'Unité', upgrade: 'Amélioration', command: 'Commandement' };
const DEMO = ['unit:stormtroopers', 'upgrade:hh 12 stormtrooper', 'command:une-cause-superieure'];

export function CardWorkshopScreen({ tagLibrary, keywords, listP1, listP2 }: Props) {
  const base = useMemo(() => buildWorkshopCatalog(tagLibrary, keywords), [tagLibrary, keywords]);
  const [personal, setPersonal] = useState<WorkshopCard[]>([]);
  const urls = useRef<string[]>([]);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [tab, setTab] = useState<'library' | 'upload' | 'print'>('library');
  const [selected, setSelected] = useState(DEMO[0]);
  const [quantities, setQuantities] = usePersistentState<Record<string, number>>('swl.card-workshop-quantities.v1', {});
  const [unique, setUnique] = useState(false);
  const [report, setReport] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [printing, setPrinting] = useState(false);
  const [printFormat, setPrintFormat] = useState<WorkshopPrintFormat>('binder');
  const [textMode, setTextMode] = useState<WorkshopTextMode>('compact');
  const [printPlan, setPrintPlan] = useState<WorkshopPrintResult | null>(null);
  const [sheetsVisible, setSheetsVisible] = useState(false);
  const sheetFrame = useRef<HTMLIFrameElement>(null);
  const [allowIncomplete, setAllowIncomplete] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadKind, setUploadKind] = useState<WorkshopKind>('unit');
  const [uploadKeywords, setUploadKeywords] = useState<string[]>([]);
  const [uploadSource, setUploadSource] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [confirmedFr, setConfirmedFr] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    let active = true;
    readPersonalCards().then((entries) => {
      if (!active) return;
      const loaded = entries.map((entry) => {
        const url = URL.createObjectURL(entry.blob); urls.current.push(url);
        return { ...entry.card, image: url };
      });
      setPersonal(loaded); setStorageReady(true);
    }).catch((e: Error) => { if (active) setError(e.message); });
    return () => { active = false; urls.current.forEach((url) => URL.revokeObjectURL(url)); urls.current = []; };
  }, []);

  const catalog = useMemo(() => [...personal.map((entry) => ({ ...entry, rules: keywordOnlyRules(entry.rules) })), ...base], [personal, base]);
  const card = catalog.find((c) => c.id === selected) ?? catalog[0];
  const previewRules = card ? workshopRulesForMode(card.rules, textMode) : [];
  const changeTextMode = (mode: WorkshopTextMode) => { setTextMode(mode); setPrintFormat(mode === 'compact' ? 'binder' : 'auto'); setPrintPlan(null); setSheetsVisible(false); setMessage(''); };
  const filtered = catalog.filter((c) => (kind === 'all' || c.kind === kind) && (!query || c.search.includes(normalizeName(query))));
  const basket = catalog.filter((c) => (quantities[c.id] ?? 0) > 0);
  const total = basket.reduce((n, c) => n + quantities[c.id], 0);
  const incomplete = basket.filter((c) => c.warnings.length);
  const missingImage = basket.some((c) => !c.image);
  const setQty = (id: string, value: number) => setQuantities((prev) => ({ ...prev, [id]: Math.max(0, Math.min(99, Math.floor(value) || 0)) }));

  const selectList = (list: ParsedList) => {
    const result = workshopSelectionForList(list, catalog, unique);
    setQuantities(result.quantities); setReport([...result.notices, ...result.missing.map((s) => `Carte introuvable — ${s}`)]);
    setAllowIncomplete(false); setTab('print'); setMessage(`Sélection préparée : ${list.listName ?? list.faction ?? 'liste importée'}.`);
  };
  const importList = async (file?: File) => {
    if (!file) return;
    try {
      setError('');
      if (file.size > 2 * 1024 * 1024) throw new Error('Liste trop volumineuse (2 Mo maximum).');
      const list = importArmyList(await file.text());
      if (!list.units.length) throw new Error('Aucune unité reconnue. Déposez un export JSON ou texte Tabletop Admiral.');
      selectList(list);
    } catch (e) { setError((e as Error).message); }
  };
  const saveUpload = async () => {
    setError(''); setSaving(true);
    try {
      if (!imageFile || !uploadName.trim() || !confirmedFr) throw new Error('Indiquez le nom, choisissez un recto et confirmez qu’il est en français.');
      await validateWorkshopImage(imageFile);
      const bitmap = await createImageBitmap(imageFile);
      const valid = bitmap.width >= 200 && bitmap.height >= 200 && bitmap.width <= 12000 && bitmap.height <= 12000;
      bitmap.close();
      if (!valid) throw new Error('Dimensions attendues : de 200 à 12 000 pixels sur chaque côté.');
      const id = `personal:${crypto.randomUUID()}`;
      const rules = uploadKeywords.map((id) => workshopRule(keywords.find((k) => k.id === id)!));

      const entry: WorkshopCard = { id, key: id, name: uploadName.trim(), kind: uploadKind, rules, warnings: ['Fiche personnelle non certifiée ; valeurs X à préciser si nécessaire.'], provenance: `${uploadSource.trim() || 'Source personnelle'} · ajout le ${new Date().toLocaleDateString('fr-FR')}`, search: normalizeName(uploadName) };
      await savePersonalCard({ card: entry, blob: imageFile });
      const url = URL.createObjectURL(imageFile); urls.current.push(url);
      setPersonal((prev) => [{ ...entry, image: url }, ...prev]); setSelected(id); setTab('library');
      setUploadName(''); setUploadKeywords([]); setUploadSource(''); setImageFile(null); setConfirmedFr(false);
      if (fileInput.current) fileInput.current.value = '';
      setMessage('Carte enregistrée sur cet appareil. Aucun visuel n’a été envoyé en ligne.');
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };
  const print = async (calibration = false, preview = false) => {
    setError('');
    setSheetsVisible(false);
    const win = preview ? sheetFrame.current?.contentWindow : window.open('', '_blank');
    if (!win) { setError('Autorisez l’ouverture de la fenêtre d’impression pour ce site.'); return; }
    if (!preview) win.opener = null;
    setPrinting(true);
    try {
      if (calibration) { prepareWorkshopCalibration(win, printFormat === 'auto' ? printPlan?.format ?? 'standard' : printFormat); win.focus(); win.print(); }
      else {
        const result = await prepareWorkshopPrint(win, basket, quantities, printFormat, textMode);
        setPrintPlan(result);
        setMessage(`${result.physicalCards} cartes · ${result.sheets} feuilles A4 recto verso (${result.pages} pages PDF). ${WORKSHOP_FORMAT_LABELS[result.format]}. Un recto et un verso par carte.`);
        if (preview) setSheetsVisible(true);
        else { win.focus(); win.print(); }
      }
    } catch (e) { if (!preview) win.close(); setError((e as Error).message); } finally { setPrinting(false); }
  };
  const removePersonal = async (id: string) => {
    try { await deletePersonalCard(id); setPersonal((prev) => prev.filter((c) => c.id !== id)); setQty(id, 0); setMessage('Carte personnelle supprimée.'); }
    catch (e) { setError((e as Error).message); }
  };

  return <div className="cw-screen">
    <header className="cw-heading"><div><span className="cw-eyebrow">LEGION · ATELIER PERSONNEL</span><h2>Vos cartes. Les capacités au dos.</h2><p>Les rectos FR du catalogue, accompagnés des définitions des mots-clés au verso, une seule carte par exemplaire.</p></div><span className="cw-pill">Prêt à jouer · recto verso</span></header>
    <nav className="cw-tabs" aria-label="Atelier de cartes">
      {([['library', 'Bibliothèque'], ['upload', 'Ajouter un recto FR'], ['print', `Imprimer (${total})`]] as const).map(([id, label]) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>)}
    </nav>
    {error && <p className="cw-alert" role="alert">{error}</p>}
    {message && <p className="cw-message" role="status">{message}</p>}

    {tab === 'library' && <>
      <div className="cw-toolbar"><label>Rechercher<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom français ou anglais…" /></label><label>Texte du verso<select value={textMode} onChange={(e) => changeTextMode(e.target.value as WorkshopTextMode)}><option value="compact">Prêt à jouer · condensé</option><option value="full">Règlement intégral</option></select></label><label>Type<select value={kind} onChange={(e) => setKind(e.target.value)}><option value="all">Toutes les cartes</option>{Object.entries(KINDS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><button className="btn btn-ghost" type="button" onClick={() => { setQuantities(Object.fromEntries(DEMO.filter((id) => catalog.some((c) => c.id === id)).map((id) => [id, 1]))); setReport([]); setTab('print'); }}>Essayer les 3 cartes témoins</button></div>
      <div className="cw-workspace"><aside className="cw-catalog" aria-label="Cartes disponibles"><p>{filtered.length} cartes disponibles</p>{filtered.slice(0, 500).map((entry) => <button type="button" key={entry.id} className={card?.id === entry.id ? 'active' : ''} onClick={() => setSelected(entry.id)}><span>{entry.name}</span><small>{KINDS[entry.kind]} · {entry.warnings.length ? 'à compléter / relire' : 'définitions associées'}</small></button>)}{!filtered.length && <p>Aucune carte correspondante.</p>}</aside>
        {card && <section className="cw-detail" aria-label={`Aperçu de ${card.name}`}><div className="cw-detail-head"><div><h3>{card.name}</h3><p>{KINDS[card.kind]} · {card.provenance}</p></div><button className="btn btn-primary" type="button" onClick={() => { setQty(card.id, (quantities[card.id] ?? 0) + 1); setMessage(`${card.name} ajouté au panier.`); }}>Ajouter au panier</button></div>
          <div className="cw-preview"><figure><figcaption>RECTO · visuel du dépôt</figcaption>{card.image ? <img src={card.image} alt={`Recto de ${card.name}`} onError={(e) => { e.currentTarget.style.display = 'none'; setError(`Recto introuvable : ${card.name}. L’impression sera bloquée.`); }} /> : <p>Recto indisponible</p>}</figure><article className="cw-back-preview"><span className="cw-eyebrow">VERSO · MOTS-CLÉS</span>{previewRules.map((rule) => <section key={rule.id}><h4>{rule.title}</h4><p><DefinitionText text={rule.text} /></p></section>)}{!card.rules.length && <p>{card.keywordReview?.status === 'blank-reviewed' ? 'Recto contrôlé : aucun mot-clé à définir. Le verso reste vierge.' : 'Aucun mot-clé associé : vérifiez le recto. Le verso sera vierge.'}</p>}<footer>Une carte = un recto + un verso. Aucun effet de carte ni texte supplémentaire au dos.</footer></article></div>
          {!!card.rules.length && <details><summary>Sources des définitions</summary><p>La version « Prêt à jouer » est une aide de jeu condensée fondée sur les règles officielles, avec les valeurs du mot-clé indiqué sur le recto. Elle ne constitue pas le texte officiel intégral. Choisissez « Règlement intégral » pour consulter toutes les précisions et exemples. Les traductions françaises ont été relues par IA ; elles ne sont pas une édition publiée par AMG.</p><ul>{card.rules.map((rule) => <li key={rule.id}>{rule.title} : {rule.source}</li>)}</ul><details><summary>Règles des types d’unité</summary>{referenceTopics.topics.map((topic) => <section key={topic.id}><h4>{topic.name}</h4><p>{topic.definition} — AMG p. {topic.page}</p></section>)}</details><a href="https://www.atomicmassgames.com/swlegiondocs/" target="_blank" rel="noreferrer">Consulter les règles officielles AMG</a></details>}
          {!!card.warnings.length && <div className="cw-review"><strong>À contrôler avant la partie</strong><ul>{card.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
          {card.id.startsWith('personal:') && <button className="btn btn-ghost" type="button" onClick={() => removePersonal(card.id)}>Supprimer cette carte personnelle</button>}
        </section>}
      </div>
    </>}

    {tab === 'upload' && <section className="cw-upload"><div className="cw-section-head"><h3>Ajouter une carte française</h3><p>Ce premier lot accepte un recto déjà en français. La lecture et la traduction automatiques d’images anglaises feront l’objet du lot suivant. Images conservées uniquement sur cet appareil.</p></div>
      <div className="cw-upload-grid"><div className="cw-form">
        <label>Nom de la carte<input maxLength={120} value={uploadName} onChange={(e) => setUploadName(e.target.value)} /></label>
        <label>Type<select value={uploadKind} onChange={(e) => setUploadKind(e.target.value as WorkshopKind)}>{Object.entries(KINDS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label className="cw-file">Recto FR · PNG, JPEG ou WebP (8 Mo maximum)<input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} /></label>
        <label>Source et version<input maxLength={160} value={uploadSource} onChange={(e) => setUploadSource(e.target.value)} placeholder="Ex. PDF FR, version et date" /></label>
        <label className="cw-check"><input type="checkbox" checked={confirmedFr} onChange={(e) => setConfirmedFr(e.target.checked)} />Je confirme que le recto est en français et correspond à cette carte.</label>
        <button className="btn btn-primary" type="button" disabled={saving || !storageReady || !imageFile || !uploadName.trim() || !confirmedFr} onClick={saveUpload}>{saving ? 'Enregistrement…' : 'Enregistrer sur cet appareil'}</button>
      </div><div><h4>Capacités à expliquer au verso</h4><p>Sélectionnez les mots-clés réellement présents. Les paramètres X restent visibles et doivent être relus.</p><div className="cw-keyword-picker">{keywords.map((k) => <label className="cw-check" key={k.id}><input type="checkbox" checked={uploadKeywords.includes(k.id)} onChange={(e) => setUploadKeywords((prev) => e.target.checked ? [...prev, k.id] : prev.filter((id) => id !== k.id))} />{k.name}</label>)}</div></div></div>
    </section>}

    {tab === 'print' && <div className="cw-print-layout"><section className="cw-basket"><h3>Votre sélection</h3><p>Unités, améliorations et commandements. Les doublons de votre liste sont conservés.</p>
      <div className="cw-toolbar"><label className="cw-check"><input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} />Un exemplaire par modèle lors de la prochaine sélection</label></div>
      <div className="cw-list-actions">{listP1 && <button className="btn btn-ghost" type="button" onClick={() => selectList(listP1)}>Liste du joueur 1</button>}{listP2 && <button className="btn btn-ghost" type="button" onClick={() => selectList(listP2)}>Liste du joueur 2</button>}<label className="btn btn-ghost cw-import-list">Importer Tabletop<input type="file" accept=".json,.txt,application/json,text/plain" onChange={(e) => { void importList(e.target.files?.[0]); e.target.value = ''; }} /></label><button className="btn btn-ghost" type="button" onClick={() => { setQuantities(Object.fromEntries(base.map((c) => [c.id, 1]))); setReport([]); setAllowIncomplete(false); setPrintPlan(null); setSheetsVisible(false); setMessage('Bibliothèque entière sélectionnée : un exemplaire par modèle.'); }}>Bibliothèque entière ({base.length})</button><button className="btn btn-ghost" type="button" onClick={() => { setQuantities({}); setReport([]); setAllowIncomplete(false); }}>Vider</button></div>
      {!!report.length && <div className="cw-review" role="status"><strong>Résultat de l’import</strong><ul>{report.map((text) => <li key={text}>{text}</li>)}</ul></div>}
      {!basket.length && <p className="cw-empty">Ajoutez une carte depuis la bibliothèque ou importez votre liste Tabletop Admiral.</p>}
      {basket.map((entry) => <div className="cw-basket-row" key={entry.id}><div><strong>{entry.name}</strong><small>{KINDS[entry.kind]}{entry.warnings.length ? ' · fiche à contrôler' : ''}</small></div><label>Quantité<input type="number" min={0} max={99} aria-label={`Quantité ${entry.name}`} value={quantities[entry.id]} onChange={(e) => setQty(entry.id, Number(e.target.value))} /></label><button type="button" className="btn btn-ghost" aria-label={`Retirer ${entry.name}`} onClick={() => setQty(entry.id, 0)}>×</button></div>)}
    </section><aside className="cw-print-settings"><span className="cw-eyebrow">PRÊT POUR LA TABLE</span><h3>{total} carte{total !== 1 ? 's' : ''} sélectionnée{total !== 1 ? 's' : ''}</h3><label>Texte du verso<select value={textMode} onChange={(e) => changeTextMode(e.target.value as WorkshopTextMode)}><option value="compact">Prêt à jouer · condensé</option><option value="full">Règlement intégral</option></select></label><label>Format des cartes<select value={printFormat} onChange={(e) => { setPrintFormat(e.target.value as WorkshopPrintFormat); setPrintPlan(null); setSheetsVisible(false); }}><option value="auto">Auto · plus petit format commun lisible</option>{Object.entries(WORKSHOP_FORMAT_LABELS).filter(([id]) => textMode === 'full' || !['large','full'].includes(id)).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label><p>Classique : 9 cartes par feuille A4. Classeur légèrement agrandi : 8. Confort : 4. Le format auto choisit un même format pour tout le panier. Pour ranger toute votre bibliothèque dans les mêmes pochettes, sélectionnez-la en entier avant de choisir le format.</p><p>Les cartes sont tournées si nécessaire sur les planches pour remplir les feuilles ; leurs versos restent appariés. Les traits guident la découpe.</p>{textMode === 'compact' && <p>Définitions condensées pour jouer ; textes intégraux disponibles dans la bibliothèque.</p>}{printPlan && <div className="cw-review" role="status"><strong>{printPlan.sheets} feuilles A4 recto verso · {printPlan.pages} pages PDF</strong><p>{WORKSHOP_FORMAT_LABELS[printPlan.format]} · police minimale {printPlan.minFontSizePt} pt.</p></div>}<ol><li>Choisir du papier A4, taille réelle 100 %.</li><li>Activer le recto verso sur le <strong>bord long</strong>.</li><li>Désactiver les en-têtes et pieds de page.</li></ol><p>Pour un PDF : choisir « Enregistrer au format PDF » dans la fenêtre d’impression. Un verso contient uniquement les définitions des mots-clés. Un texte trop long bloque l’impression : aucune définition coupée, aucune carte de suite. Le verso d’une carte sans mot-clé reste vierge.</p>
      <button className="btn btn-ghost" type="button" disabled={printing} onClick={() => print(true)}>Imprimer la calibration</button>
      {!!incomplete.length && <div className="cw-review"><p>{incomplete.length} modèle(s) comportent des informations à contrôler. Les avertissements restent dans cette interface et ne sont pas imprimés au dos.</p><details><summary>Voir les {incomplete.length} cartes à contrôler</summary><ul>{incomplete.map((entry) => <li key={entry.id}><button className="btn btn-ghost" type="button" onClick={() => { setSelected(entry.id); setTab('library'); }}>{entry.name}</button><ul>{entry.warnings.map(w => <li key={w}>{w}</li>)}</ul></li>)}</ul></details><label className="cw-check"><input type="checkbox" checked={allowIncomplete} onChange={(e) => setAllowIncomplete(e.target.checked)} />Inclure ces fiches à contrôler</label></div>}
      {missingImage && <p className="cw-alert">Un recto manque : retirez la carte concernée avant d’imprimer.</p>}
      <button className="btn btn-ghost" type="button" disabled={printing || !total || missingImage || (!!incomplete.length && !allowIncomplete)} onClick={() => print(false, true)}>Prévisualiser les planches</button>
      <button className="btn btn-primary" type="button" disabled={printing || !total || missingImage || (!!incomplete.length && !allowIncomplete)} onClick={() => print()}>{printing ? 'Préparation…' : 'Imprimer / enregistrer le PDF'}</button><small>Les pages sont alternées rectos / versos. La calibration vérifie votre imprimante ; un léger décalage matériel peut nécessiter un réglage.</small>
    </aside></div>}
    {tab === 'print' && <section className={sheetsVisible ? 'cw-sheet-preview' : 'cw-sheet-preparing'} aria-label="Aperçu des planches"><h3>Planches A4 · rectos puis versos</h3><iframe ref={sheetFrame} title="Planches recto verso à imprimer" /></section>}
  </div>;
}

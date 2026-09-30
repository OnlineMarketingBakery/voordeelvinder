// The purple side panel (Figma 88:7430: 372 px, title 30/32, body, mascot 323×289 at the
// bottom). Below lg it becomes a compact header above the progress card: a small mascot beside
// the title, no body (the mobile form is not designed; proposal, brief §6). The title is the
// page's h1; the mascot is decorative.
import type { FormPanel as FormPanelData } from '../../lib/form/types';

export function FormPanel({ panel }: { panel: FormPanelData }) {
  const { image } = panel;
  return (
    <div className="flex items-center gap-4 overflow-hidden rounded-2xl bg-purple-600 px-4 py-3 text-white surface-dark lg:flex-col lg:items-stretch lg:gap-0 lg:px-[33px] lg:pt-9 lg:pb-[17px]">
      <div className="min-w-0 flex-1 lg:flex-none">
        <h1 className="text-title-sm lg:text-h4">{panel.title}</h1>
        <p className="mt-[23px] hidden text-body text-on-purple-muted lg:block">{panel.body}</p>
      </div>
      <picture
        data-morph="form-mascot"
        className="order-first block w-20 shrink-0 lg:order-none lg:mt-auto lg:w-[min(323px,calc(100%+16px))] lg:self-center lg:pt-8"
      >
        {image.sources.map((source) => (
          <source key={source.type} type={source.type} srcSet={source.srcset} sizes={image.sizes} />
        ))}
        <img
          src={image.src}
          width={image.width}
          height={image.height}
          alt=""
          loading="eager"
          decoding="async"
          className="h-auto w-full"
        />
      </picture>
    </div>
  );
}

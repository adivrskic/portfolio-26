import { ArrowRight, ExternalLink } from "lucide-react";
import { MENU_PROJECTS } from "../../constants/projects";
import "./MenuSections.css";

const PROJECTS = MENU_PROJECTS;

export default function MenuWork({ isMobile, onShowcase }) {
  const feat = PROJECTS.find((p) => p.featured);
  const rest = PROJECTS.filter((p) => !p.featured);

  return (
    <>
      {feat && (
        <div
          data-stg
          className="menu-work__featured"
          style={{ padding: isMobile ? "16px 14px 12px" : "28px 28px 24px" }}
          onClick={() =>
            feat.showcaseSection &&
            onShowcase &&
            onShowcase(feat.showcaseSection)
          }
        >
          <div className="menu-work__head" style={{ marginBottom: 10 }}>
            <span className="menu-work__title menu-work__title--lg">
              {feat.title}
            </span>
            <span className="menu-work__year">FEATURED · {feat.year}</span>
          </div>
          <p className="menu-work__desc">{feat.desc}</p>
          <div className="menu-work__meta-row">
            <span className="menu-work__tech">{feat.tech}</span>
            {feat.url && (
              <a
                href={feat.url}
                target="_blank"
                rel="noopener noreferrer"
                className="menu-work__visit"
                onClick={(e) => e.stopPropagation()}
              >
                Visit <ExternalLink size={10} strokeWidth={1.5} />
              </a>
            )}
          </div>
        </div>
      )}

      <div
        className={`menu-work__grid ${
          isMobile ? "menu-work__grid--mobile" : "menu-work__grid--desktop"
        }`}
      >
        {rest.map((p, j) => (
          <div
            key={j}
            data-stg
            className="menu-work__card"
            onClick={() =>
              p.showcaseSection && onShowcase && onShowcase(p.showcaseSection)
            }
          >
            <div>
              <div className="menu-work__head" style={{ marginBottom: 8 }}>
                <span className="menu-work__title menu-work__title--sm">
                  {p.title}
                </span>
                <span className="menu-work__year menu-work__year--sm">
                  {p.year}
                </span>
              </div>
              <div className="menu-work__desc menu-work__desc--sm">
                {p.desc}
              </div>
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="menu-work__visit menu-work__visit--sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  Visit <ExternalLink size={9} strokeWidth={1.5} />
                </a>
              )}
            </div>
            <div className="menu-work__card-arrow">
              <ArrowRight size={14} strokeWidth={1.5} />
            </div>
          </div>
        ))}
      </div>

      <div className="menu-work__showcase-link">
        <div
          data-stg
          className="menu-work__card"
          style={{
            padding: isMobile ? "16px 14px 12px" : "20px 28px 18px",
            borderRadius: 14,
          }}
          onClick={() => onShowcase && onShowcase()}
        >
          <div>
            <div className="menu-work__head" style={{ marginBottom: 8 }}>
              <span className="menu-work__title menu-work__title--sm">
                View Showcase
              </span>
            </div>
            <div className="menu-work__desc menu-work__desc--sm">
              Browse the full interactive project collection
            </div>
          </div>
          <div className="menu-work__card-arrow">
            <ArrowRight size={14} strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </>
  );
}

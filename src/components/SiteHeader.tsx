"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import CartIcon from "./CartIcon";
const links = [
  {
    label: "Coleções",
    children: [
      ["/produtos/grau", "Óculos de grau"],
      ["/produtos/sol", "Óculos de sol"],
    ],
  },
  ["/lentes", "Lentes"],
  ["/sobre", "Nossa história"],
];
export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const nav = useRef<HTMLElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);
  const dropdownButton = useRef<HTMLButtonElement>(null);
  function closeMenus() {
    setOpen(false);
    setDropdownOpen(false);
  }
  useEffect(() => {
    if (!dropdownOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!dropdown.current?.contains(event.target as Node))
        setDropdownOpen(false);
    };
    const closeOnNavigation = () => setDropdownOpen(false);
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("popstate", closeOnNavigation);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("popstate", closeOnNavigation);
    };
  }, [dropdownOpen]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nav.current?.querySelector<HTMLElement>("a, button")?.focus();
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setDropdownOpen(false);
        button.current?.focus();
      }
      if (e.key === "Tab") {
        const nodes = [
          button.current,
          ...Array.from(
            nav.current?.querySelectorAll<HTMLElement>("a, button") || [],
          ),
        ].filter(
          (node): node is HTMLElement =>
            !!node && node.getClientRects().length > 0,
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", close);
    const media = window.matchMedia("(min-width: 1001px)");
    const closeOnNavigation = () => {
      setOpen(false);
      setDropdownOpen(false);
    };
    const closeOnResize = () => {
      if (media.matches) closeOnNavigation();
    };
    media.addEventListener("change", closeOnResize);
    window.addEventListener("popstate", closeOnNavigation);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", close);
      media.removeEventListener("change", closeOnResize);
      window.removeEventListener("popstate", closeOnNavigation);
    };
  }, [open]);
  return (
    <>
      <a className="skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="header store-header">
        <div className="brand">
          <Link
            href="/"
            aria-label="Óptica Ocular, início"
            onClick={closeMenus}
          >
            <span className="logo-frame">
              <Image
                src="/assets/logo-dark.png"
                width={44}
                height={38}
                alt=""
              />
            </span>
            <Image
              src="/assets/brand-text-header.svg"
              width={218}
              height={41}
              alt="Óptica Ocular"
              className="header-brand-text"
            />
          </Link>
        </div>
        <div className="store-header-actions">
          <CartIcon />
          <button
            ref={button}
            className="menu-toggle"
            type="button"
            aria-controls="store-nav"
            aria-expanded={open}
            onClick={() => {
              setDropdownOpen(false);
              setOpen(!open);
            }}
          >
            {open ? "Fechar" : "Menu"}{" "}
            <span aria-hidden="true">{open ? "×" : "☰"}</span>
          </button>
        </div>
        <nav
          ref={nav}
          id="store-nav"
          aria-label="Navegação principal"
          className={open ? "open" : ""}
        >
          {links.map((link) => {
            if (
              Array.isArray(link) &&
              link.length === 2 &&
              typeof link[0] === "string"
            ) {
              const [href, label] = link;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={pathname.startsWith(href) ? "page" : undefined}
                  onClick={closeMenus}
                >
                  {label}
                </Link>
              );
            } else if (
              typeof link === "object" &&
              link !== null &&
              "label" in link
            ) {
              return (
                <div
                  key={link.label}
                  ref={dropdown}
                  className="nav-dropdown"
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") setDropdownOpen(true);
                  }}
                  onPointerLeave={(event) => {
                    if (
                      event.pointerType === "mouse" &&
                      !event.currentTarget.contains(document.activeElement)
                    )
                      setDropdownOpen(false);
                  }}
                  onBlur={(event) => {
                    if (
                      !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                      )
                    )
                      setDropdownOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && dropdownOpen) {
                      event.stopPropagation();
                      setDropdownOpen(false);
                      dropdownButton.current?.focus();
                    }
                  }}
                >
                  <button
                    ref={dropdownButton}
                    type="button"
                    className="nav-dropdown-toggle"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-expanded={dropdownOpen}
                    aria-controls="store-collections"
                  >
                    {link.label}
                  </button>
                  {dropdownOpen && (
                    <div id="store-collections" className="nav-dropdown-menu">
                      {link.children.map(([href, label]) => (
                        <Link
                          key={href}
                          href={href}
                          aria-current={
                            pathname.startsWith(href) ? "page" : undefined
                          }
                          onClick={closeMenus}
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })}
        </nav>
      </header>
    </>
  );
}

-- Create Admin User for GoldPen
-- This script creates an admin user with email: admin@goldpen.kr

-- First, check if organization exists, if not create one
DO $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  -- Get or create organization
  SELECT id INTO v_org_id FROM public.organizations WHERE name = '골드펜 테스트 학원' LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (id, name, type, settings)
    VALUES (
      '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3',
      '골드펜 테스트 학원',
      'academy',
      '{}'::jsonb
    )
    RETURNING id INTO v_org_id;

    RAISE NOTICE 'Created organization: %', v_org_id;
  ELSE
    RAISE NOTICE 'Organization already exists: %', v_org_id;
  END IF;

  -- Generate a fixed UUID for admin user (for consistency)
  v_user_id := 'e9f6b5e9-da82-4409-8e07-1fd194273a33'::uuid;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    -- Update existing user
    UPDATE public.users
    SET
      email = 'admin@goldpen.kr',
      name = 'GoldPen Admin',
      role = 'owner',
      org_id = v_org_id,
      updated_at = NOW()
    WHERE id = v_user_id;

    RAISE NOTICE 'Updated existing user: %', v_user_id;
  ELSE
    -- Create new user
    INSERT INTO public.users (id, org_id, role, name, email, phone, created_at, updated_at)
    VALUES (
      v_user_id,
      v_org_id,
      'owner',
      'GoldPen Admin',
      'admin@goldpen.kr',
      '010-1234-5678',
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Created new user: %', v_user_id;
  END IF;

  -- Update organization owner
  UPDATE public.organizations
  SET owner_id = v_user_id
  WHERE id = v_org_id;

  RAISE NOTICE 'Admin user setup complete!';
  RAISE NOTICE 'Email: admin@goldpen.kr';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Organization ID: %', v_org_id;
END $$;

-- Display the created user
SELECT
  u.id,
  u.email,
  u.name,
  u.role,
  o.name as organization_name
FROM public.users u
LEFT JOIN public.organizations o ON u.org_id = o.id
WHERE u.email = 'admin@goldpen.kr';
